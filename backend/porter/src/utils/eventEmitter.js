import { EventEmitter } from 'events';

/**
 * Event Emitter สำหรับ Porter Service
 * ใช้สำหรับ broadcast updates เมื่อมีการเปลี่ยนแปลงข้อมูล
 */
class PorterEventEmitter extends EventEmitter {}

const porterEventEmitter = new PorterEventEmitter();

export default porterEventEmitter;

