import { UserResponseStructure } from "@polusgg/module-polusgg-auth-api/src/types/userResponseStructure";
import { ApiResponse } from "@polusgg/module-polusgg-auth-api/src/request/request";
import { Request, Response } from "express";
import got from "got/dist/source";

export type AuthenticatedRequest = Request & { user: UserResponseStructure };

export function authenticate(fn: (req: AuthenticatedRequest, res: Response) => void) {
  return async (req: Request, res: Response): Promise<void> => {
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

    const user = JSON.parse((await got.post(`https://account.polus.gg/api-private/v1/users/${uuid}`)).body) as ApiResponse<UserResponseStructure>;

    if (!user.success) {
      throw new Error(user.data.message);
    }

    if (user.data.client_token !== token) {
      res.status(400);
      res.send({
        ok: false,
        cause: `Authentication error: Invalid token or uuid`,
      });

      return;
    }

    (req as AuthenticatedRequest).user = user.data;

    fn(req as AuthenticatedRequest, res);
  };
}
