const {decodeMultipartText}=require('../utils/filename');
describe('LT-014 multipart UTF-8 text',()=>{
 test('repairs latin1 UTF-8 mojibake',()=>{expect(decodeMultipartText('Ð¤Ð¾Ñ‚Ð¾ ÐºÐ»Ð¸ÐµÐ½Ñ‚Ð°')).toBe('Фото клиента');});
 test('keeps proper Cyrillic intact',()=>{expect(decodeMultipartText('Материалы суда')).toBe('Материалы суда');});
});
