const validEncodings = {
	"utf8": true,
	"utf-8": true, // alias of utf8
	"utf16le": true,
	"latin1": true,
	"base64": true,
	"hex": true,
	"ascii": true,
	"binary": true, // alias of latin1
	"ucs2": true // alias of utf16le
}
const conversionBuffer = new ArrayBuffer(8);

const conversionBuffer8Bytes = new Uint8Array(conversionBuffer);
const conversionBuffer4Bytes = new Uint8Array(conversionBuffer, 0, 4);
const conversionBuffer2Bytes = new Uint8Array(conversionBuffer, 0, 2);

const conversionBufferFloat64 = new Float64Array(conversionBuffer, 0, 1);
const conversionBufferFloat32 = new Float32Array(conversionBuffer, 0, 1);
const encoder = new TextEncoder();
const decoder = new TextDecoder();

let buffer_readBigInt64BE;
let buffer_readBigInt64LE;
let buffer_readBigUInt64BE;
let buffer_readBigUInt64LE;
let buffer_writeBigInt64BE;
let buffer_writeBigInt64LE;
let buffer_writeBigUInt64BE;
let buffer_writeBigUInt64LE;
try{
	// Is this terrible? Yes! But unfortunatly less than 90% of users have bigints at the time of writing
	buffer_readBigInt64BE = new Function(`
		const buffer = arguments[0];
		const offset = arguments[1];
		let result = buffer.readBigUInt64BE(offset);
		if(result > 9223372036854775807n){
			result -= 18446744073709551616n;
		}
		return result;
	`);
	buffer_readBigInt64LE = new Function(`
		const buffer = arguments[0];
		const offset = arguments[1];
		let result = buffer.readBigUInt64LE(offset);
		if(result > 9223372036854775807n){
			result -= 18446744073709551616n;
		}
		return result;
	`);
	buffer_readBigUInt64BE = new Function(`
		const buffer = arguments[0];
		const offset = arguments[1];
		let result = BigInt(buffer[offset + 7]);
		result += BigInt(buffer[offset + 6]) << 8n;
		result += BigInt(buffer[offset + 5]) << 16n;
		result += BigInt(buffer[offset + 4]) << 24n;
		result += BigInt(buffer[offset + 3]) << 32n;
		result += BigInt(buffer[offset + 2]) << 40n;
		result += BigInt(buffer[offset + 1]) << 48n;
		result += BigInt(buffer[offset]) << 56n;
		return result;
	`);
	buffer_readBigUInt64LE = new Function(`
		const buffer = arguments[0];
		const offset = arguments[1];
		let result = BigInt(buffer[offset]);
		result += BigInt(buffer[offset + 1]) << 8n;
		result += BigInt(buffer[offset + 2]) << 16n;
		result += BigInt(buffer[offset + 3]) << 24n;
		result += BigInt(buffer[offset + 4]) << 32n;
		result += BigInt(buffer[offset + 5]) << 40n;
		result += BigInt(buffer[offset + 6]) << 48n;
		result += BigInt(buffer[offset + 7]) << 56n;
		return result;
	`);
	buffer_writeBigInt64BE = new Function(`
		const buffer = arguments[0];
		const value = arguments[1];
		const offset = arguments[2];
		if(value < 0){
			value = 18446744073709551616n + value;
		}
		return buffer.writeBigUInt64BE(value, offset);
	`);
	buffer_writeBigInt64LE = new Function(`
		const buffer = arguments[0];
		const value = arguments[1];
		const offset = arguments[2];
		if(value < 0){
			value = 18446744073709551616n + value;
		}
		return buffer.writeBigUInt64LE(value, offset);
	`);
	buffer_writeBigUInt64BE = new Function(`
		const buffer = arguments[0];
		const value = arguments[1];
		const offset = arguments[2];
		buffer[offset + 7] = Number(value & 255n);
		buffer[offset + 6] = Number((value >> 8n) & 255n);
		buffer[offset + 5] = Number((value >> 16n) & 255n);
		buffer[offset + 4] = Number((value >> 24n) & 255n);
		buffer[offset + 3] = Number((value >> 32n) & 255n);
		buffer[offset + 2] = Number((value >> 40n) & 255n);
		buffer[offset + 1] = Number((value >> 48n) & 255n);
		buffer[offset] = Number((value >> 56n) & 255n);
		return offset + 8;
	`);
	buffer_writeBigUInt64LE = new Function(`
		const buffer = arguments[0];
		const value = arguments[1];
		const offset = arguments[2];
		buffer[offset] = Number(value & 255n);
		buffer[offset + 1] = Number((value >> 8n) & 255n);
		buffer[offset + 2] = Number((value >> 16n) & 255n);
		buffer[offset + 3] = Number((value >> 24n) & 255n);
		buffer[offset + 4] = Number((value >> 32n) & 255n);
		buffer[offset + 5] = Number((value >> 40n) & 255n);
		buffer[offset + 6] = Number((value >> 48n) & 255n);
		buffer[offset + 7] = Number((value >> 56n) & 255n);
		return offset + 8;
	`);
}catch(ex){
	// BigInts aren't supported here.
}

class Buffer extends Uint8Array{
	/*
	constructor(...args){
		super(...args);
	}
	*/
	compare(target, targetStart = 0, targetEnd = target.length, sourceStart = 0, sourceEnd = this.length){
		let compareVal = 0;
		let targetI = targetStart;
		for(let thisI = sourceStart; thisI < sourceEnd; thisI += 1){
			if(targetI >= targetEnd){
				compareVal = 1;
				break;
			}
			const thisValue = this[thisI];
			const targetValue = target[targetI];
			if(thisValue > targetValue){
				compareVal = 1;
				break;
			}else if(thisValue < targetValue){
				compareVal = -1;
				break;
			}
			targetI += 1;
		}
		if(compareVal === 0 && (targetEnd - targetStart) > (sourceEnd - sourceStart)){
			compareVal = -1;
		}
		return compareVal;
	}
	copy(target, targetStart = 0, sourceStart = 0, sourceEnd = this.length){
		let copied = 0;
		let targetI = targetStart;
		for(let i = sourceStart; i < sourceEnd; i += 1){
			target[targetI] = this[i];
			targetI += 1;
			copied += 1;
		}
		return copied;
	}
	equals(otherBuffer){
		if(otherBuffer.length !== this.length){
			return false;
		}
		// We might be able to optimize this using Uint32Arrays
		for(let i = 0; i < this.length; i += 1){
			if(this[i] !== otherBuffer[i]){
				return false;
			}
		}
		return true;
	}
	fill(value, start = 0, end = this.length, encoding = "utf8"){
		if(typeof value === "number"){
			super.fill(value, start, end);
		}else{
			if(typeof value === "string"){
				value = Buffer.from(value, encoding);
			}
			let shouldCopy = end - start;
			let copied = 0;
			for(let i = start; i <= (end - value.length); i += value.length){
				copied += value.length;
				value.copy(this, i);
			}
			value.copy(this, start + copied, 0, shouldCopy - copied);
		}
		return this;
	}
	includes(value, byteOffset = 0, encoding = "utf8"){
		return this.indexOf(value, byteOffset, encoding) !== -1;
	}
	indexOf(value, byteOffset = 0, encoding = "utf8"){
		if(byteOffset < 0){
			byteOffset = this.length + byteOffset;
		}
		if(typeof value === "number"){
			return super.indexOf(value, byteOffset);
		}else{
			if(typeof value === "string"){
				value = Buffer.from(value, encoding);
			}
			for(let i = byteOffset; i <= (this.length - value.length); i += 1){
				if(value.equals(
					this.subarray(i, i + value.length)
				)){
					return i;
				}
			}
			return -1;
		}
	}
	lastIndexOf(value, byteOffset = 0, encoding = "utf8"){
		if(byteOffset < 0){
			byteOffset = this.length + byteOffset;
		}
		if(typeof value === "number"){
			return super.lastIndexOf(value, byteOffset);
		}else{
			if(typeof value === "string"){
				value = Buffer.from(value, encoding);
			}
			for(let i = this.length - value.length; i >= byteOffset; i -= 0){
				if(value.equals(
					this.subarray(i, i + value.length)
				)){
					return i;
				}
			}
			return -1;
		}
	}
	map(...args){
		return new Buffer(super.map(...args));
	}
	readBigInt64BE(offset = 0){
		return BigInt(buffer_readBigInt64BE(this, offset));
	}
	readBigInt64LE(offset = 0){
		return BigInt(buffer_readBigInt64LE(this, offset));
	}
	readBigUInt64BE(offset = 0){
		return BigInt(buffer_readBigUInt64BE(this, offset));
	}
	readBigUInt64LE(offset = 0){
		return BigInt(buffer_readBigUInt64LE(this, offset));
	}
	readDoubleBE(offset = 0){
		// Idk how to actually do this so JS will do it for me lol;
		for(let i = 0; i < 8; i += 1){
			conversionBuffer8Bytes[i] = this[i + offset];
		}
		conversionBuffer8Bytes.reverse();
		return conversionBufferFloat64[0];
	}
	readDoubleLE(offset = 0){
		for(let i = 0; i < 8; i += 1){
			conversionBuffer8Bytes[i] = this[i + offset];
		}
		return conversionBufferFloat64[0];
	}
	readFloatBE(offset = 0){
		// Idk how to actually do this so JS will do it for me lol;
		for(let i = 0; i < 4; i += 1){
			conversionBuffer4Bytes[i] = this[i + offset];
		}
		conversionBuffer4Bytes.reverse();
		return conversionBufferFloat32[0];
	}
	readFloatLE(offset = 0){
		for(let i = 0; i < 4; i += 1){
			conversionBuffer4Bytes[i] = this[i + offset];
		}
		return conversionBufferFloat32[0];
	}
	readInt8(offset = 0){
		let result = this[offset];
		if(result > 127){
			result -= 256;
		}
		return result;
	}
	readInt16BE(offset = 0){
		let result = this.readUInt16BE(offset);
		if(result > 32767){
			result -= 65536;
		}
		return result;
	}
	readInt16LE(offset = 0){
		let result = this.readUInt16LE(offset);
		if(result > 32767){
			result -= 65536;
		}
		return result;
	}
	readInt32BE(offset = 0){
		let result = this.readUInt32BE(offset);
		if(result > 2147483647){
			result -= 4294967296;
		}
		return result;
	}
	readInt32LE(offset = 0){
		let result = this.readUInt32LE(offset);
		if(result > 2147483647){
			result -= 4294967296;
		}
		return result;
	}
	readIntBE(offset = 0, byteLength){
		let result = this.readUIntBE(offset, byteLength);
		if(result > 2 ** (byteLength - 1)){
			result -= 2 ** byteLength;
		}
		return result;
	}
	readIntLE(offset = 0, byteLength){
		let result = this.readUIntLE(offset, byteLength);
		if(result > 2 ** (byteLength - 1)){
			result -= 2 ** byteLength;
		}
		return result;
	}
	readUInt8(offset = 0){
		return this[offset];
	}
	readUInt16BE(offset = 0){
		let result = this[offset + 1];
		result += this[offset] << 8n;
		return result;
	}
	readUInt16LE(offset = 0){
		let result = this[offset];
		result += this[offset + 1] << 8n;
		return result;
	}
	readUInt32BE(offset = 0){
		let result = this[offset + 3];
		result += this[offset + 2] << 8n;
		result += this[offset + 1] << 16n;
		result += this[offset] << 24n;
		return result;
	}
	readUInt32LE(offset = 0){
		let result = this[offset];
		result += this[offset + 1] << 8n;
		result += this[offset + 2] << 16n;
		result += this[offset + 3] << 24n;
		return result;
	}
	readUIntBE(offset, byteLength){
		let mul = 1;
		let val = 0;
		for(let i = byteLength - 1; i >= 0; i -= 1){
			val += this[offset + i] * mul;
			mul *= 0x100;
		}
		return val;
	}
	readUIntLE(offset, byteLength){
		let mul = 1;
		let val = 0;
		for(let i = 0; i < byteLength; i += 1){
			val += this[offset + i] * mul;
			mul *= 0x100;
		}
		return val;
	}
	subarray(start = 0, end = this.length){
		return new Buffer(super.subarray(start, end));
	}
	slice(start = 0, end = this.length){
		return this.subarray(start, end);
	}
	swap16(){
		for(let i = 0; i < this.length; i += 2){
			conversionBuffer2Bytes[0] = this[i];
			this[i] = this[i + 1];
			this[i + 1] = conversionBuffer2Bytes[0];
		}
		return this;
	}
	swap32(){
		for(let i = 0; i < this.length; i += 4){
			conversionBuffer4Bytes[0] = this[i];
			conversionBuffer4Bytes[1] = this[i + 1];
			conversionBuffer4Bytes[2] = this[i + 2];
			conversionBuffer4Bytes[3] = this[i + 3];
			conversionBuffer4Bytes.reverse();
			this[i] = conversionBuffer4Bytes[0];
			this[i + 1] = conversionBuffer4Bytes[1];
			this[i + 2] = conversionBuffer4Bytes[2];
			this[i + 3] = conversionBuffer4Bytes[3];
		}
		return this;
	}
	swap64(){
		for(let i = 0; i < this.length; i += 8){
			for(let ii = 0; ii < 8; ii += 1){
				conversionBuffer8Bytes[ii] = this[i + ii];
			}
			conversionBuffer8Bytes.reverse();
			for(let ii = 0; ii < 8; ii += 1){
				this[i + ii] = conversionBuffer8Bytes[ii];
			}
		}
	}
	toJSON(){
		return{
			type: "Buffer",
			data: [...this]
		}
	}
	toString(encoding = "utf8", start = 0, end = this.length){
		let buf = this.subarray(start, end);
		switch(encoding){
			case "utf8":
			case "utf-8":
				return decoder.decode(buf);
			case "utf16le":
			case "utf-16le":
			case "utf-16-le":
			case "ucs2":
				return String.fromCharCode(...(new Uint16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2)));
			case "latin1":
			case "binary":
				return String.fromCharCode(...buf);
			case "ascii":
				return String.fromCharCode(...buf.map(v => {
					return v & 127;
				}));
			case "base64":
				return btoa(String.fromCharCode(...buf));
			case "hex": {
				let str = "";
				for(let i = 0; i < buf.length; i += 1){
					const v = buf[i]
					if(v < 16){
						str += "0";
					}
					str += v.toString(16);
				}
				return str;
			}
			default:
				throw new Error("Unknown encoding: " + encoding);
		}
	}
	write(string, offset = 0, length = this.length - offset, encoding = "utf8"){
		const tmpBuffer = Buffer.from(string, encoding);
		tmpBuffer.copy(this, offset, 0, length);
		if(tmpBuffer.length < length){
			return tmpBuffer.length;
		}
		return length;
	}
	writeBigInt64BE(value, offset = 0){
		return buffer_writeBigInt64BE(value, offset);
	}
	writeBigInt64LE(value, offset = 0){
		return buffer_writeBigInt64LE(value, offset);
	}
	writeBigUInt64BE(value, offset = 0){
		return buffer_writeBigUInt64BE(value, offset);
	}
	writeBigUInt64LE(value, offset = 0){
		return buffer_writeBigUInt64LE(value, offset);
	}
	writeDoubleBE(value, offset = 0){
		// Again, don't know how to do this myself!
		conversionBufferFloat64[0] = value;
		conversionBuffer8Bytes.reverse();
		for(let i = 0; i < 8; i += 1){
			this[offset + i] = conversionBuffer8Bytes[i];
		}
		return offset + 8;
	}
	writeDoubleLE(value, offset = 0){
		conversionBufferFloat64[0] = value;
		for(let i = 0; i < 8; i += 1){
			this[offset + i] = conversionBuffer8Bytes[i];
		}
		return offset + 8;
	}
	writeFloatBE(value, offset = 0){
		// Again, don't know how to do this myself!
		conversionBufferFloat32[0] = value;
		conversionBuffer4Bytes.reverse();
		for(let i = 0; i < 4; i += 1){
			this[offset + i] = conversionBuffer4Bytes[i];
		}
		return offset + 4;
	}
	writeFloatLE(value, offset = 0){
		conversionBufferFloat32[0] = value;
		for(let i = 0; i < 4; i += 1){
			this[offset + i] = conversionBuffer4Bytes[i];
		}
		return offset + 4;
	}
	writeInt8(value, offset = 0){
		if(value < 0){
			value = 256 + value;
		}
		this[offset] = value;
		return offset + 1;
	}
	writeInt16BE(value, offset = 0){
		if(value < 0){
			// 2 ** 16
			value = 65536 + value;
		}
		this.writeUInt16BE(value, offset);
		return offset + 2;
	}
	writeInt16LE(value, offset = 0){
		if(value < 0){
			// 2 ** 16
			value = 65536 + value;
		}
		this.writeUInt16LE(value, offset);
		return offset + 2;
	}
	writeInt32BE(value, offset = 0){
		if(value < 0){
			// 2 ** 32
			value = 4294967296 + value;
		}
		this.writeUInt32BE(value, offset);
		return offset + 4;
	}
	writeInt32LE(value, offset = 0){
		if(value < 0){
			// 2 ** 32
			value = 4294967296 + value;
		}
		this.writeUInt32LE(value, offset);
		return offset + 4;
	}
	writeIntBE(value, offset = 0, byteLength){
		if(value < 0){
			value = (2 ** byteLength) + value;
		}
		writeUIntBE(value, offset, byteLength);
		return offset + byteLength;
	}
	writeIntLE(value, offset = 0, byteLength){
		if(value < 0){
			value = (2 ** byteLength) + value;
		}
		writeUIntLE(value, offset, byteLength);
		return offset + byteLength;
	}
	writeUInt8(value, offset = 0){
		this[offset] = value;
		return offset + 1;
	}
	writeUInt16BE(value, offset = 0){
		this[offset + 1] = value & 255;
		this[offset] = (value >> 8) & 255;
		return offset + 2;
	}
	writeUInt16LE(value, offset = 0){
		this[offset] = value & 255;
		this[offset + 1] = (value >> 8) & 255;
		return offset + 2;
	}
	writeUInt32BE(value, offset = 0){
		this[offset + 3] = value & 255;
		this[offset + 2] = (value >> 8) & 255;
		this[offset + 1] = (value >> 16) & 255;
		this[offset] = (value >> 24) & 255;
		return offset + 4;
	}
	writeUInt32LE(value, offset = 0){
		this[offset] = value & 255;
		this[offset + 1] = (value >> 8) & 255;
		this[offset + 2] = (value >> 16) & 255;
		this[offset + 3] = (value >> 24) & 255;
		return offset + 4;
	}
	writeUIntBE(value, offset, byteLength){
		let mul = 0x100 ** byteLength;
		for(let i = 0; i < byteLength; i += 1){
			mul /= 0x100;
			this[offset + i] = Math.floor(value / mul) & 255;
		}
		return offset + byteLength;
	}
	writeUIntLE(value, offset, byteLength){
		let mul = 1;
		for(let i = 0; i < byteLength; i += 1){
			this[offset + i] = Math.floor(value / mul) & 255;
			mul *= 0x100;
		}
		return offset + byteLength;
	}
}
// TODO: Perhaps we should do pooling for more performance
Buffer.alloc = function(size = 0){
	return new Buffer(size);
}
Buffer.allocUnsafe = Buffer.alloc;
Buffer.allocUnsafeSlow = Buffer.alloc;
const calculateUTF8LengthFromUTF16String = function(str = ""){
	let result = 0;
	for(let i = 0; i < str.length; i += 1){
		const codePoint = str.codePointAt(i);
		if(codePoint <= 0x7f){
			result += 1;
			continue;
		}
		if(codePoint <= 0x7ff){
			result += 2;
			continue;
		}
		if(codePoint <= 0xffff){
			result += 3;
			continue;
		}
		// This character now bigger than 16 bits, so we should skip one string position
		i += 1;
		// Fun fact: In the original 1993 UTF8 spec, it could go up to 6 bytes!
		// But since unicode codepoints were limited to 21 bits in 2003, the largest we should ever see is 4.
		result += 4;
	}
	return result;
}
const calculateDecodedBase64Length = function(str = ""){
	let result = str.length;
	while(result > 1 && str[result - 1] === "=" ){
		result -= 1;
	}
	return Math.floor(bytes * 0.75);
}
Buffer.byteLength = function(thing, encoding){
	if(typeof thing === "string"){
		switch(encoding){
			case "utf8":
			case "utf-8":
				return calculateUTF8LengthFromUTF16String(thing);
			case "latin1":
			case "binary":
			case "ascii":
				return thing.length;
			case "utf16le":
			case "utf-16le":
			case "utf-16-le":
			case "ucs2":
				return thing.length * 2;
			case "base64":
				return calculateDecodedBase64Length(thing);
			case "hex": {
				return thing.length / 2;
			}
			default:
				throw new Error("Unknown encoding: " + byteOffsetOrEncoding);
		}
	}else{
		return thing.length
	}
}
Buffer.compare = function(buf1, buf2){
	return buf1.compare(buf2);
}
Buffer.concat = function(list = [], totalLength){
	if(totalLength === undefined){
		totalLength = 0;
		for(let i = 0; i < list.length; i += 1){
			totalLength += list[i].length;
		}
	}
	let resultOffset = 0;
	const resultBuffer = Buffer.alloc(totalLength);
	for(let i = 0; i < list.length; i += 1){
		const buff = list[i];
		buff.copy(resultBuffer, resultOffset);
		resultOffset += buff.length;
	}
}
Buffer.from = function(thing, byteOffsetOrEncodingOrFill, lengthOrEncoding){
	if(
		Array.isArray(thing) ||
		thing instanceof Uint8Array ||
		thing instanceof Buffer
	){
		return new Buffer(thing);
	}else if(typeof thing === "number"){
		const newBuffer = new Buffer(thing);
		if(byteOffsetOrEncodingOrFill != null){
			newBuffer.fill(byteOffsetOrEncodingOrFill, 0, thing, lengthOrEncoding);
		}
		return newBuffer;
	}else if(thing instanceof ArrayBuffer){
		return new Buffer(thing, byteOffsetOrEncodingOrFill, lengthOrEncoding);
	}else if(typeof thing === "object"){
		if(thing.type !== "buffer" || Array.isArray(thing.data)){
			throw new TypeError("Given a strange object, not sure what to do");
		}
		return new Buffer(thing.data);
	}else if(typeof thing === "string"){
		switch(byteOffsetOrEncodingOrFill){
			case undefined:
			case null:
			case "utf8":
			case "utf-8":
				return new Buffer(encoder.encode(thing));
			case "utf16le":
			case "utf-16le":
			case "utf-16-le":
			case "ucs2":
				return new Buffer(
					(new Uint16Array([...thing].map(v => v.charCodeAt(0)))).buffer
				);
			case "latin1":
			case "binary":
			case "ascii":
				return new Buffer([...thing].map(v => v.charCodeAt(0)));
			case "base64":
				return new Buffer([...atob(thing)].map(v => v.charCodeAt(0)));
			case "hex": {
				const newBuffer = new Buffer(thing.length / 2);
				for(let i = 0; i < thing.length; i += 2){
					newBuffer[i / 2] = parseInt(thing.substring(i, i + 2), 16);
				}
				return newBuffer;
			}
			default:
				throw new Error("Unknown encoding: " + byteOffsetOrEncodingOrFill);
		}
	}
}
Buffer.isBuffer = function(obj){
	return obj instanceof Buffer;
}
Buffer.isEncoding = function(encoding){
	return validEncodings[encoding] || false;
}
Buffer.poolSize = 0;

module.exports = Buffer;
if(globalThis.Buffer === undefined){
	globalThis.Buffer = Buffer;
}
