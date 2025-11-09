import React from 'react';
import { socket } from './socket';

export function ConnectionManager({ isConnected }) {
  return (
    <div className='connection-manager'>
      Status: <strong>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</strong>
    </div>
  );
}