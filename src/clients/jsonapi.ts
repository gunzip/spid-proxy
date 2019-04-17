import * as t from "io-ts";
import {
  ApiHeaderJson,
  basicResponseDecoder,
  BasicResponseType,
  createFetchRequestForApi,
  IGetApiRequestType,
  IPostApiRequestType,
  TypeofApiCall
} from "italia-ts-commons/lib/requests";

import {
  EmailString,
  FiscalCode,
  NonEmptyString
} from "italia-ts-commons/lib/strings";
import nodeFetch from "node-fetch";

const CreateUserRequestT = t.interface({
  data: t.interface({
    attributes: t.interface({
      mail: EmailString,
      name: FiscalCode
    }),
    relationships: t.interface({
      roles: t.interface({
        data: t.array(
          t.interface({
            id: NonEmptyString,
            type: t.literal("user_role--user_role")
          })
        )
      })
    }),
    type: t.literal("user--user")
  })
});
type CreateUserRequestT = t.TypeOf<typeof CreateUserRequestT>;

const GetUserResponseT = t.interface({
  data: t.array(
    t.interface({
      attributes: t.interface({
        drupal_internal__uid: t.number,
        mail: EmailString,
        name: NonEmptyString
      })
    })
  )
});
type GetUserResponseT = t.TypeOf<typeof GetUserResponseT>;

type GetUserT = IGetApiRequestType<
  {
    readonly username: FiscalCode;
    readonly jwt: string;
  },
  never,
  never,
  BasicResponseType<GetUserResponseT>
>;

type CreateUserT = IPostApiRequestType<
  {
    readonly drupalUser: CreateUserRequestT;
    readonly jwt: string;
  },
  never,
  never,
  BasicResponseType<GetUserResponseT>
>;

export function JsonapiClient(
  baseUrl?: string,
  // tslint:disable-next-line:no-any
  fetchApi: typeof fetch = (nodeFetch as any) as typeof fetch
): {
  readonly getUser: TypeofApiCall<GetUserT>;
  readonly createUser: TypeofApiCall<CreateUserT>;
} {
  const options = {
    baseUrl,
    fetchApi
  };

  const getUser: GetUserT = {
    headers: () => ({
      // tslint:disable-next-line: no-duplicate-string
      Accept: "application/vnd.api+json"
    }),
    method: "get",
    query: params => ({
      "filter[name]": params.username
    }),
    response_decoder: basicResponseDecoder(GetUserResponseT),
    url: () => `/user/user`
  };

  const createUser: CreateUserT = {
    body: params => JSON.stringify(params.drupalUser),
    headers: () => ({
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json"
    }),
    method: "post",
    query: () => ({}),
    response_decoder: basicResponseDecoder(GetUserResponseT),
    url: () => `/user/user`
  };

  return {
    createUser: createFetchRequestForApi(createUser, options),
    getUser: createFetchRequestForApi(getUser, options)
  };
}

export type JsonapiClient = typeof JsonapiClient;
