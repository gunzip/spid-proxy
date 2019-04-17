import * as express from "express";
import {
  IResponseErrorInternal,
  IResponseSuccessJson,
  ResponseErrorInternal,
  ResponseSuccessJson
} from "italia-ts-commons/lib/responses";

import { JsonapiClient } from "../clients/jsonapi";
import JwtService from "../services/jwt";

import { isEmpty } from "fp-ts/lib/Array";
import { isLeft } from "fp-ts/lib/Either";
import { NonEmptyString } from "italia-ts-commons/lib/strings";
import { User } from "../types/user";
import { log } from "../utils/logger";
import { UserMetadataT } from "../utils/webhooks";

export default class WebhookController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly jsonApiClient: ReturnType<JsonapiClient>,
    private readonly adminUid: number,
    private readonly defaultRoleId: string
  ) {}
  public async getUserMetadata(
    req: express.Request
  ): Promise<IResponseSuccessJson<UserMetadataT> | IResponseErrorInternal> {
    const errorOrUser = User.decode(req.body);

    if (isLeft(errorOrUser)) {
      log.error(
        "Cannot extract user from request body: %s",
        JSON.stringify(req.body)
      );
      return ResponseErrorInternal("Cannot extract user from request body");
    }

    const user = errorOrUser.value;

    // Get admin JWT
    const jwt = this.jwtService.getJwtForUid(this.adminUid);

    // Get Drupal user uid if exists
    const getUserResponse = await this.jsonApiClient.getUser({
      jwt,
      username: user.fiscal_code
    });

    if (!getUserResponse || getUserResponse.status !== 200) {
      log.error(
        "Cannot get user from json api: %s",
        JSON.stringify(getUserResponse)
      );
      return ResponseErrorInternal("Cannot get user from json api.");
    }

    const isExistingUser = !isEmpty(getUserResponse.value.data);

    if (!isExistingUser) {
      log.debug("Creating new user %s", user.fiscal_code);
    }

    // Create Drupal user if not exists
    const userResponse = !isExistingUser
      ? await this.jsonApiClient.createUser({
          drupalUser: {
            data: {
              attributes: {
                mail: user.spid_email,
                name: user.fiscal_code
              },
              relationships: {
                roles: {
                  data: [
                    {
                      // TODO: remove this cast
                      id: this.defaultRoleId as NonEmptyString,
                      type: "user_role--user_role"
                    }
                  ]
                }
              },
              type: "user--user"
            }
          },
          jwt
        })
      : getUserResponse;

    if (!userResponse || userResponse.status !== 200) {
      log.error(
        "Cannot post user to json api: %s",
        JSON.stringify(userResponse)
      );
      return ResponseErrorInternal("Cannot post user to json api.");
    }

    const uid = userResponse.value.data[0].attributes.drupal_internal__uid.toString();

    return ResponseSuccessJson({
      uid
    });
  }
}
