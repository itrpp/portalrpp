// ข้อมูลเงื่อนไขการทำงานสำหรับ IPD (อัปเดตตาม API SPEC สปสช. 2024)
export const conditionsData = [
  {
    file: 'ADP',
    title: 'เพิ่ม field SP_ITEM สำหรับระบบ IPD ตามมาตรฐาน e-Claim',
    conditions: [
      'ตรวจสอบว่าไฟล์มี field SP_ITEM อยู่แล้วหรือไม่ก่อนการประมวลผล',
      'เพิ่ม field SP_ITEM (Character, length=2) ต่อท้ายสุดของโครงสร้างไฟล์',
      'กำหนดค่าเริ่มต้น SP_ITEM = "" (empty string) สำหรับทุก record',
      'รักษาข้อมูลต้นฉบับทั้งหมดโดยไม่เปลี่ยนแปลงโครงสร้างเดิม',
      'รักษาฟิลด์ภาษาไทย (NAME, DESC, REMARK) เป็น Buffer เพื่อรักษาข้อมูลให้สมบูรณ์',
      'แก้ไขรูปแบบวันที่ DATEOPD เป็นรูปแบบ DD/MM/YYYY'
    ],
    purpose: 'เตรียมไฟล์ ADP สำหรับระบบ IPD ตามมาตรฐาน e-Claim ของ สปสช. โดยเพิ่ม field SP_ITEM เพื่อรองรับข้อมูลการจำแนกรายการพิเศษ'
  },
  {
    file: 'DRU',
    title: 'เพิ่ม field SP_ITEM สำหรับระบบ IPD ตามมาตรฐาน e-Claim',
    conditions: [
      'เพิ่ม field SP_ITEM (Character, length=2) ต่อท้ายสุดของโครงสร้างไฟล์',
      'กำหนดค่าเริ่มต้น SP_ITEM = "" (empty string) สำหรับทุก record',
      'รักษาข้อมูลต้นฉบับทั้งหมดรวมถึง DATE_SERV, DIDNAME, UNIT ไว้ตามรูปแบบเดิม',
      'ใช้ Buffer copy เพื่อรักษาข้อมูลภาษาไทยและรูปแบบวันที่ไว้ตามต้นฉบับ',
      'ไม่มีการแปลงรูปแบบวันที่หรือข้อมูลใดๆ ทั้งสิ้น',
      'รักษา encoding ของข้อมูลภาษาไทยให้ถูกต้องตามมาตรฐาน TIS-620'
    ],
    purpose: 'เตรียมไฟล์ยาสำหรับระบบ IPD ตามมาตรฐาน e-Claim ของ สปสช. โดยรักษาความสมบูรณ์ของข้อมูลต้นฉบับและเพิ่ม field SP_ITEM'
  },
  {
    file: 'OTHER',
    title: 'Copy ข้อมูลต้นฉบับตามมาตรฐาน 16 แฟ้ม IPD',
    conditions: [
      'Copy ไฟล์ต้นฉบับโดยไม่มีการเปลี่ยนแปลงใดๆ ทั้งสิ้น',
      'ใช้ชื่อไฟล์เดิม + "_IPD.dbf" เพื่อแยกแยะจากไฟล์ต้นฉบับ',
      'ไม่มีการเพิ่ม field หรือแปลงข้อมูลใดๆ',
      'รักษาโครงสร้างและ encoding ของไฟล์ต้นฉบับไว้ทุกประการ',
      'รองรับไฟล์ทั้ง 16 แฟ้ม: PAT, OPD, ODX, OOP, IPD, IRF, IOP, CHA, CHT, AER, ADV, LVD, DRU, ADP, INS, IDX'
    ],
    purpose: 'ส่งออกไฟล์ 14 แฟ้มอื่นๆ (นอกเหนือจาก ADP และ DRU) ไปยังระบบ IPD ตามมาตรฐาน e-Claim โดยรักษาข้อมูลต้นฉบับไว้ครบถ้วน'
  }
];

export const problemSolutions = [
  {
    problem: 'ไฟล์ ADP และ DRU ไม่มี field SP_ITEM สำหรับระบบ IPD ตามมาตรฐาน e-Claim',
    solution: 'เพิ่ม field SP_ITEM (Character, length=2) ต่อท้ายสุดโดยไม่เปลี่ยนแปลงข้อมูลต้นฉบับ และกำหนดค่าเริ่มต้นเป็น empty string',
    files: ['ADP', 'DRU']
  },
  {
    problem: 'ข้อมูลภาษาไทยในไฟล์ DRU เสียหายเมื่อแปลงรูปแบบหรือ encoding',
    solution: 'ใช้ Buffer copy เพื่อรักษาข้อมูลภาษาไทยและรูปแบบวันที่ไว้ตามต้นฉบับ รวมถึงรักษา TIS-620 encoding',
    files: ['DRU']
  },
  {
    problem: 'รูปแบบวันที่ในไฟล์ DRU เปลี่ยนไปจากต้นฉบับ ทำให้ข้อมูล DATE_SERV ผิดพลาด',
    solution: 'รักษารูปแบบวันที่ต้นฉบับโดยไม่มีการแปลงใดๆ และใช้ Buffer copy สำหรับ field DATE_SERV',
    files: ['DRU']
  },
  {
    problem: 'ไฟล์ 14 แฟ้มอื่นๆ (นอกเหนือจาก ADP และ DRU) ไม่สามารถส่งออกไปยังระบบ IPD ได้ตามมาตรฐาน',
    solution: 'Copy ไฟล์ต้นฉบับทั้ง 14 แฟ้มโดยไม่มีการเปลี่ยนแปลงใดๆ และเพิ่ม suffix "_IPD.dbf"',
    files: ['OTHER']
  },
  {
    problem: 'การตรวจสอบ field SP_ITEM ซ้ำซ้อนในไฟล์ที่มี field นี้อยู่แล้ว',
    solution: 'ตรวจสอบการมีอยู่ของ field SP_ITEM ก่อนการประมวลผล หากมีแล้วให้รักษาค่าเดิมไว้',
    files: ['ADP', 'DRU']
  },
  {
    problem: 'ข้อมูลใน field DIDNAME และ UNIT ของไฟล์ DRU เสียหายจากการประมวลผล',
    solution: 'ใช้ Buffer copy โดยตรงสำหรับทุก field ในไฟล์ DRU เพื่อรักษาข้อมูลต้นฉบับไว้ทุกประการ',
    files: ['DRU']
  }
];
