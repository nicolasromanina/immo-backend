export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  return secret;
};

export const getJwtExpiresIn = (): string => {
  return process.env.JWT_EXPIRES_IN || '1d';
};

