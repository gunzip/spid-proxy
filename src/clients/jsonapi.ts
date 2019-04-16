import * as t from "io-ts";
import {
  ApiHeaderJson,
  basicResponseDecoder,
  BasicResponseType,
  createFetchRequestForApi,
  IGetApiRequestType,
  TypeofApiCall
} from "italia-ts-commons/lib/requests";

import {
  EmailString,
  FiscalCode,
  NonEmptyString
} from "italia-ts-commons/lib/strings";
import nodeFetch from "node-fetch";

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

export function JsonapiClient(
  baseUrl?: string,
  // tslint:disable-next-line:no-any
  fetchApi: typeof fetch = (nodeFetch as any) as typeof fetch
): {
  readonly getUser: TypeofApiCall<GetUserT>;
} {
  const options = {
    baseUrl,
    fetchApi
  };

  const getUser: GetUserT = {
    headers: ApiHeaderJson,
    method: "get",
    query: params => ({
      "filter[name]": params.username
    }),
    response_decoder: basicResponseDecoder(GetUserResponseT),
    url: () => `/user/user`
  };

  return {
    getUser: createFetchRequestForApi(getUser, options)
  };
}

export type JsonapiClient = typeof JsonapiClient;
