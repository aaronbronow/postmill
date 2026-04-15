// there are multiple modes to add as header: //nobundling //native //npm //nodejs
// https://www.windmill.dev/docs/getting_started/scripts_quickstart/typescript#modes

// import { toWords } from "number-to-words@1"
//import * as wmill from "windmill-client"

// fill the type, or use the +Resource type to get a type-safe reference to a resource
// type Postgresql = object

export async function preprocessor(
  event:
    // | {
    //   kind: "webhook";
    //   body: any;
    //   raw_string: string | null;
    //   query: Record<string, string>;
    //   headers: Record<string, string>;
    // }
     {
      kind: "http";
      body: any;
      raw_string: string | null;
      route: string;
      path: string;
      method: string;
      params: Record<string, string>;
      query: Record<string, string>;
      headers: Record<string, string>;
    }
) {
  return {
    // return the args to be passed to the runnable
    raw_string: event.raw_string
  };
}

export async function main(args) {
  return "raw: " + args.raw_string;
}

// export async function main(
//   raw_string: string,
//   challenge: number,
//   hub: {
//     mode: "subscribe";
//     challenge: number;
//     verify_token: string;
//   }
// ) {
//   // let x = await wmill.getVariable('u/user/foo')
//   return challenge
// }
