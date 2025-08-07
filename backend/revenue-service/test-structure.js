// ========================================
// TEST FILE STRUCTURE
// ========================================

const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// สร้างโครงสร้างโฟลเดอร์ตามรูปแบบใหม่
async function createTestStructure() {
  const basePath = './uploads';
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // สร้างโฟลเดอร์ตามประเภทไฟล์
  const fileTypes = ['dbf', 'rep', 'stm'];
  
  for (const fileType of fileTypes) {
    const typePath = path.join(basePath, fileType);
    const datePath = path.join(typePath, dateStr);
    
    // สร้างโฟลเดอร์
    await fs.ensureDir(datePath);
    
    // สร้างไฟล์ทดสอบ
    const uuid = uuidv4();
    const uuidPath = path.join(datePath, uuid);
    await fs.ensureDir(uuidPath);
    
    // สร้างไฟล์ทดสอบ
    let testFileName;
    switch (fileType) {
      case 'dbf':
        testFileName = 'PAT6805.DBF';
        break;
      case 'rep':
        testFileName = '680600025.xls';
        break;
      case 'stm':
        testFileName = 'STM_14641_OPUCS256806_01.xls';
        break;
    }
    
    const testFilePath = path.join(uuidPath, testFileName);
    await fs.writeFile(testFilePath, `Test file for ${fileType} - ${new Date().toISOString()}`);
    
    console.log(`✅ Created: ${testFilePath}`);
  }
  
  console.log('\n📁 File structure created successfully!');
  console.log('Structure: /uploads/{fileType}/{date}/{uuid}/{filename}');
}

// แสดงโครงสร้างโฟลเดอร์
async function showStructure() {
  console.log('\n📂 Current file structure:');
  
  const basePath = './uploads';
  const items = await fs.readdir(basePath);
  
  for (const item of items) {
    const itemPath = path.join(basePath, item);
    const stats = await fs.stat(itemPath);
    
    if (stats.isDirectory()) {
      console.log(`📁 ${item}/`);
      
      try {
        const subItems = await fs.readdir(itemPath);
        for (const subItem of subItems) {
          const subItemPath = path.join(itemPath, subItem);
          const subStats = await fs.stat(subItemPath);
          
          if (subStats.isDirectory()) {
            console.log(`  📁 ${subItem}/`);
            
            try {
              const subSubItems = await fs.readdir(subItemPath);
              for (const subSubItem of subSubItems) {
                const subSubItemPath = path.join(subItemPath, subSubItem);
                const subSubStats = await fs.stat(subSubItemPath);
                
                if (subSubStats.isDirectory()) {
                  console.log(`    📁 ${subSubItem}/`);
                  
                  try {
                    const files = await fs.readdir(subSubItemPath);
                    for (const file of files) {
                      console.log(`      📄 ${file}`);
                    }
                  } catch (error) {
                    console.log(`      ❌ Error reading files: ${error.message}`);
                  }
                } else {
                  console.log(`    📄 ${subSubItem}`);
                }
              }
            } catch (error) {
              console.log(`  ❌ Error reading subdirectories: ${error.message}`);
            }
          } else {
            console.log(`  📄 ${subItem}`);
          }
        }
      } catch (error) {
        console.log(`❌ Error reading directory: ${error.message}`);
      }
    } else {
      console.log(`📄 ${item}`);
    }
  }
}

// รันการทดสอบ
async function runTest() {
  try {
    console.log('🚀 Testing file structure...\n');
    
    await createTestStructure();
    await showStructure();
    
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// รันการทดสอบ
runTest(); 