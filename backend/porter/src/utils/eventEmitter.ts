import { EventEmitter } from 'events';

/**
 * Event Emitter สำหรับ Porter Service
 * ใช้สำหรับ broadcast updates เมื่อมีการเปลี่ยนแปลงข้อมูล
 */
class PorterEventEmitter extends EventEmitter {
  constructor() {
    super();

    const maxListenersFromEnv = Number.parseInt(process.env.PORTER_MAX_LISTENERS ?? '500', 10);
    const normalizedMaxListeners =
      Number.isNaN(maxListenersFromEnv) || maxListenersFromEnv <= 0 ? 500 : maxListenersFromEnv;

    this.setMaxListeners(normalizedMaxListeners);
  }
}

const porterEventEmitter = new PorterEventEmitter();

export default porterEventEmitter;
