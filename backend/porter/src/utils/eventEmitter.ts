import { EventEmitter } from 'events';

/**
 * Event Emitter สำหรับ Porter Service
 * ใช้สำหรับ broadcast updates เมื่อมีการเปลี่ยนแปลงข้อมูล
 */
class PorterEventEmitter extends EventEmitter {
  constructor() {
    super();

    const maxListenersFromEnv = Number.parseInt(process.env.PORTER_MAX_LISTENERS ?? '100', 10);
    const maxListeners = Number.isNaN(maxListenersFromEnv) ? 100 : maxListenersFromEnv;

    this.setMaxListeners(maxListeners);
  }
}

const porterEventEmitter = new PorterEventEmitter();

export default porterEventEmitter;
