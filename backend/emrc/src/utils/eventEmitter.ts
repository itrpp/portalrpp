import { EventEmitter } from 'events';

/**
 * Event Emitter สำหรับ EMRC Service
 * ใช้สำหรับ broadcast updates เมื่อมีการเปลี่ยนแปลงข้อมูล
 */
class EMRCEventEmitter extends EventEmitter {}

const emrcEventEmitter = new EMRCEventEmitter();

export default emrcEventEmitter;

