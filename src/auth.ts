import { timingSafeEqual } from "crypto";
import { FastifyRequest } from "fastify";

function safeEquals(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);

  if(aBuf.length !== bBuf.length) {
    return false;
  }

  return timingSafeEqual(aBuf, bBuf);
}

export function assertBearerAuth(req: FastifyRequest) {
  const primary = process.env.RUNNER_API_TOKEN?.trim();
  const previous = process.env.RUNNER_API_TOKEN_PREVIOUS?.trim();

  if(!primary) {
    throw new Error("RUNNER_API_TOKEN is not configured");
  }

  const auth = req.headers.authorization;
  if(!auth || !auth.startsWith("Bearer ")) {
    return false;
  }

  const token = auth.slice("Bearer ".length).trim();
  if(token.length === 0) {
    return false;
  }

  if(safeEquals(token, primary)) {
    return true;
  }

  if(previous && safeEquals(token, previous)) {
    return true;
  }

  return false;
}
