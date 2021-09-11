import { UserResponseStructure } from "@polusgg/module-polusgg-auth-api/src/types/userResponseStructure";
import { ApiResponse } from "@polusgg/module-polusgg-auth-api/src/request/request";
import { Request, Response } from "express";
import got, { RequestError } from "got/dist/source";

export type AuthenticatedRequest = Request & { user: UserResponseStructure };

export function authenticate(fn: (req: AuthenticatedRequest, res: Response) => void) {
  return async (req: Request, res: Response): Promise<void> => {
    //@ts-ignore
    req._pgg_id = Math.random();

    //@ts-ignore
    console.log(`[${req._pgg_id}] [Authenticate] Entered method`, Date.now());

    if (req.headers.authorization === undefined) {
      res.status(400);
      res.send({
        ok: false,
        cause: `Authentication error: Missing authorization header`,
      });

      return;
    }

    const [token, uuid] = req.headers.authorization.split(":");

    if ((token as string | undefined) === undefined || (uuid as string | undefined) === undefined) {
      res.status(400);
      res.send({
        ok: false,
        cause: `Authentication error: Malformed authorization header`,
      });

      return;
    }

    let user;

    //@ts-ignore
    console.log(`[${req._pgg_id}] [Authenticate] Before Account API GET`, Date.now());

    try {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      user = JSON.parse((await got(`https://account.polus.gg/api-private/v1/users/${uuid}`, { headers: { Authorization: `Bearer ${process.env.ACCOUNT_AUTH_TOKEN}`, Accept: "application/json" } })).body) as ApiResponse<UserResponseStructure>;
    } catch (err) {
      if ((err as RequestError).response!.statusCode === 404) {
        res.send({
          ok: false,
          cause: `Authentication error: Invalid authorization header`,
        });

        return;
      }

      res.send({
        ok: false,
        cause: `Authentication error: ${err}`,
      });
    }

    if (!user.success) {
      res.send({
        ok: false,
        cause: `Authentication error: ${user.data.message}`,
      });
    }

    if (user.data.client_token !== token) {
      res.status(400);
      res.send({
        ok: false,
        cause: `Authentication error: Invalid token or uuid`,
      });

      return;
    }

    //@ts-ignore
    console.log(`[${req._pgg_id}] [Authenticate] Apply Data & return`, Date.now());

    (req as AuthenticatedRequest).user = user.data;

    fn(req as AuthenticatedRequest, res);
  };
}
