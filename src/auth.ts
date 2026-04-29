import { FastifyRequest } from "fastify";

export function assertBearerAuth(req: FastifyRequest) {
  const expected = process.env.RUNNER_API_TOKEN;
  if(!expected) {
    throw new Error("RUNNER_API_TOKEN is not configured");
  }

  const auth = req.headers.authorization;
  if(!auth || !auth.startsWith("Bearer ")) {
    return false;
  }

  const token = auth.slice("Bearer ".length).trim();
  return token.length > 0 && token === expected;
}
