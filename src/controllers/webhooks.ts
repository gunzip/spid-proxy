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
import { User } from "../types/user";
import { log } from "../utils/logger";
import { UserMetadataT } from "../utils/webhooks";

export default class WebhookController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly jsonApiClient: ReturnType<JsonapiClient>,
    private readonly adminUid: number
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

    // Get Drupal user uid
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

    // TODO: Create Drupal user if not exists
    // **************************************
    if (isEmpty(getUserResponse.value.data)) {
      log.debug("User not found for %s", user.fiscal_code);
    }

    const uid = getUserResponse.value.data[0].attributes.drupal_internal__uid.toString();

    return ResponseSuccessJson({
      uid
    });
  }
}
