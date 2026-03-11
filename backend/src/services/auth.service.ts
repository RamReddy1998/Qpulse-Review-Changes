import { Role } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { BadRequestError, ConflictError, UnauthorizedError } from '../utils/errors';
import { JwtPayload } from '../types';
import logger from '../config/logger';

export class AuthService {
  private userRepo: UserRepository;
  private sessionRepo: SessionRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.sessionRepo = new SessionRepository();
  }

  async register(username: string, password: string, role: Role) {
    const existing = await this.userRepo.findByUsername(username);
    if (existing) {
      throw new ConflictError('Username already exists');
    }

    const passwordHash = await hashPassword(password);
    const user = await this.userRepo.create(username, passwordHash, role);

    logger.info('User registered', { username, role });

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }

  async login(username: string, password: string, role: Role) {
    const user = await this.userRepo.findByUsername(username);
    if (!user) {
      throw new UnauthorizedError('Invalid username or password');
    }

    if (user.role !== role) {
      throw new BadRequestError(`This account is registered as ${user.role}. Please use the correct role to login.`);
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid username or password');
    }

    const payload: JwtPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Store refresh token in DB with 7-day expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.sessionRepo.create(user.id, refreshToken, expiresAt);

    logger.info('User logged in', { username, role });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token not provided');
    }

    // Verify token signature
    let payload: JwtPayload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token exists in DB
    const session = await this.sessionRepo.findByRefreshToken(refreshToken);
    if (!session) {
      throw new UnauthorizedError('Refresh token not found or already used');
    }

    // Delete old refresh token (rotation)
    await this.sessionRepo.deleteByRefreshToken(refreshToken);

    // Generate new tokens
    const newPayload: JwtPayload = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
    };

    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    // Store new refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.sessionRepo.create(payload.userId, newRefreshToken, expiresAt);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      await this.sessionRepo.deleteByRefreshToken(refreshToken);
    }
    logger.info('User logged out');
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
