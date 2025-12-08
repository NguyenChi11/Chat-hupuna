import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setSocketInstance(io: Server) {
  ioInstance = io;
}

export function getSocketInstance(): Server {
  if (!ioInstance) {
    throw new Error('Socket.IO instance not initialized');
  }
  return ioInstance;
}