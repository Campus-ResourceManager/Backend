const requireAuth = require("../src/middlewares/requireAuth");
const requireRole = require("../src/middlewares/requireRole");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("requireAuth middleware", () => {
  it("returns 401 when there is no session user", () => {
    const req = { session: null };
    const res = createRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Authentication required" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when session user exists", () => {
    const req = { session: { user: { userId: "123" } } };
    const res = createRes();
    const next = jest.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("requireRole middleware", () => {
  it("returns 403 when user role is not allowed", () => {
    const middleware = requireRole("admin");
    const req = { session: { user: { role: "coordinator" } } };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Access denied: insufficient permissions",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when user role is allowed", () => {
    const middleware = requireRole(["admin", "coordinator"]);
    const req = { session: { user: { role: "coordinator" } } };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
}
);

