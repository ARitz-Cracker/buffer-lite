/* eslint-disable no-magic-numbers */
/* global BigInt */
/* global BigInt64Array */
/* global BigUint64Array */
const DEFAULT_POOL_SIZE = 8192;
const validEncodings = new Set([
	"utf8",
	"utf-8", // alias of utf8
	"utf16le",
	"utf-16le",
	"latin1",
	"base64",
	"hex",
	"ascii",
	"binary", // alias of latin1
	"ucs2" // alias of utf16le
]);
const conversionBuffer = new ArrayBuffer(8);

const conversionBuffer8Bytes = new Uint8Array(conversionBuffer);
const conversionBuffer4Bytes = new Uint8Array(conversionBuffer, 0, 4);
const conversionBuffer2Bytes = new Uint8Array(conversionBuffer, 0, 2);

const conversionBufferFloat64 = new Float64Array(conversionBuffer, 0, 1);
const conversionBufferFloat32 = new Float32Array(conversionBuffer, 0, 1);
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bigIntConsts = {};
try{
	bigIntConsts["8"] = BigInt("8");
	bigIntConsts["16"] = BigInt("16");
	bigIntConsts["24"] = BigInt("24");
	bigIntConsts["32"] = BigInt("32");
	bigIntConsts["40"] = BigInt("40");
	bigIntConsts["48"] = BigInt("48");
	bigIntConsts["56"] = BigInt("56");
	bigIntConsts["255"] = BigInt("255");
	bigIntConsts["9223372036854775807"] = BigInt("9223372036854775807");
	bigIntConsts["18446744073709551616"] = BigInt("18446744073709551616");
}catch(ex){
	// BigInts aren't supported here.
}

// Derived from some very un-scientific tests
const MAX_STRING_FROM_CHAR_CODE_ARGS = 32 * 1024;

const stringFromCharCodes = function(/** @type {number[] | Uint8Array | Uint16Array}*/ charCodes){
	if(charCodes.length <= MAX_STRING_FROM_CHAR_CODE_ARGS){
		return String.fromCharCode(...charCodes);
	}
	let result = "";
	for(let i = 0; i < charCodes.length; i += MAX_STRING_FROM_CHAR_CODE_ARGS){
		result += String.fromCharCode(...charCodes.slice(i, i + MAX_STRING_FROM_CHAR_CODE_ARGS));
	}
	return result;
};

class Buffer extends Uint8Array {
	constructor(...args){
		if(typeof args[0] === "string"){
			// I can't believe some widely used modules still use this 🤦‍♂️
			super(Buffer.byteLength(args[0]));
			Buffer.from(args[0], args[1]).copy(this);
		}else{
			super(...args);
		}
	}
	compare(target, targetStart = 0, targetEnd = target.length, sourceStart = 0, sourceEnd = this.length){
		if(!(target instanceof Uint8Array)){
			throw new TypeError("Comparison target must be a Uint8Array or Buffer");
		}
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
		let source = sourceStart === 0 && sourceEnd === this.length ?
			this :
			this.subarray(sourceStart, sourceEnd);
		if((targetStart + source.length) > target.length){
			source = source.subarray(0, source.length - (
				(targetStart + source.length) - target.length
			));
		}
		target.set(source, targetStart);
		return source.length;
	}
	equals(otherBuffer){
		if(!(otherBuffer instanceof Uint8Array)){
			throw new TypeError("The \"otherBuffer\" argument must be an instance of Buffer or Uint8Array");
		}
		if(otherBuffer === this){
			return true;
		}
		if(otherBuffer.length !== this.length){
			return false;
		}
		if(this.length === 0){
			return true;
		}
		if(
			this.length >= 4 &&
			(this.byteOffset % 4) === 0 &&
			(otherBuffer.byteOffset % 4) === 0
		){
			/* Compare the buffers quicker if we can (4 bytes at a time)
			   I would use Float64Arrays here, but then there's an issue with NaN */
			const uint32ArrayLength = this.length - (this.length % 4);
			const thisUint32Array = new Uint32Array(this.buffer, this.byteOffset, uint32ArrayLength / 4);
			const otherUint32Array = new Uint32Array(
				otherBuffer.buffer,
				otherBuffer.byteOffset,
				thisUint32Array.length
			);
			for(let i = 0; i < thisUint32Array.length; i += 1){
				if(thisUint32Array[i] !== otherUint32Array[i]){
					return false;
				}
			}
			// Compare the remaining 1-3 bytes if they exist
			for(let i = uint32ArrayLength; i < this.length; i += 1){
				if(this[i] !== otherBuffer[i]){
					return false;
				}
			}
		}else{
			for(let i = 0; i < this.length; i += 1){
				if(this[i] !== otherBuffer[i]){
					return false;
				}
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
			if(!(value instanceof Uint8Array)){
				throw new TypeError("fill value must be a number, string, Buffer, or Uint8Array");
			}
			if(!(value instanceof Buffer)){
				value = new Buffer(value.buffer, value.byteOffset, value.length);
			}
			const shouldCopy = end - start;
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
		}
		if(typeof value === "string"){
			value = Buffer.from(value, encoding);
		}else if(!(value instanceof Uint8Array)){
			throw new TypeError("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array.");
		}
		for(let i = byteOffset; i <= (this.length - value.length); i += 1){
			if(this.subarray(i, i + value.length).equals(value)){
				return i;
			}
		}
		return -1;
	}
	lastIndexOf(value, byteOffset = this.length, encoding = "utf8"){
		if(byteOffset < 0){
			byteOffset = this.length + byteOffset;
		}
		if(typeof value === "number"){
			return super.lastIndexOf(value, byteOffset);
		}
		if(typeof value === "string"){
			value = Buffer.from(value, encoding);
		}else if(!(value instanceof Uint8Array)){
			throw new TypeError("The \"value\" argument must be one of type number or string or an instance of Buffer or Uint8Array.");
		}
		for(let i = byteOffset; i >= 0; i -= 1){
			if(this.subarray(i, i + value.length).equals(value)){
				return i;
			}
		}
		return -1;
	}
	map(...args){
		const newArray = super.map(...args);
		return new Buffer(newArray.buffer, newArray.byteOffset, newArray.byteLength);
	}
	readBigInt64BE(offset = 0){
		let result = this.readBigUInt64BE(offset);
		if(result > bigIntConsts["9223372036854775807"]){
			result -= bigIntConsts["18446744073709551616"];
		}
		return result;
	}
	readBigInt64LE(offset = 0){
		let result = this.readBigUInt64LE(offset);
		if(result > bigIntConsts["9223372036854775807"]){
			result -= bigIntConsts["18446744073709551616"];
		}
		return result;
	}
	readBigUInt64BE(offset = 0){
		if(offset < 0 || (offset + 7) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		let result = BigInt(this[offset + 7]);
		result += BigInt(this[offset + 6]) << bigIntConsts["8"];
		result += BigInt(this[offset + 5]) << bigIntConsts["16"];
		result += BigInt(this[offset + 4]) << bigIntConsts["24"];
		result += BigInt(this[offset + 3]) << bigIntConsts["32"];
		result += BigInt(this[offset + 2]) << bigIntConsts["40"];
		result += BigInt(this[offset + 1]) << bigIntConsts["48"];
		result += BigInt(this[offset]) << bigIntConsts["56"];
		return result;
	}
	readBigUInt64LE(offset = 0){
		if(offset < 0 || (offset + 7) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		let result = BigInt(this[offset]);
		result += BigInt(this[offset + 1]) << bigIntConsts["8"];
		result += BigInt(this[offset + 2]) << bigIntConsts["16"];
		result += BigInt(this[offset + 3]) << bigIntConsts["24"];
		result += BigInt(this[offset + 4]) << bigIntConsts["32"];
		result += BigInt(this[offset + 5]) << bigIntConsts["40"];
		result += BigInt(this[offset + 6]) << bigIntConsts["48"];
		result += BigInt(this[offset + 7]) << bigIntConsts["56"];
		return result;
	}
	readDoubleBE(offset = 0){
		if(offset < 0 || (offset + 7) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		// Idk how to actually do this so JS will do it for me lol;
		for(let i = 0; i < 8; i += 1){
			conversionBuffer8Bytes[i] = this[i + offset];
		}
		conversionBuffer8Bytes.reverse();
		return conversionBufferFloat64[0];
	}
	readDoubleLE(offset = 0){
		if(offset < 0 || (offset + 7) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		for(let i = 0; i < 8; i += 1){
			conversionBuffer8Bytes[i] = this[i + offset];
		}
		return conversionBufferFloat64[0];
	}
	readFloatBE(offset = 0){
		if(offset < 0 || (offset + 3) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		// Idk how to actually do this so JS will do it for me lol;
		for(let i = 0; i < 4; i += 1){
			conversionBuffer4Bytes[i] = this[i + offset];
		}
		conversionBuffer4Bytes.reverse();
		return conversionBufferFloat32[0];
	}
	readFloatLE(offset = 0){
		if(offset < 0 || (offset + 3) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		for(let i = 0; i < 4; i += 1){
			conversionBuffer4Bytes[i] = this[i + offset];
		}
		return conversionBufferFloat32[0];
	}
	readInt8(offset = 0){
		if(offset < 0 || offset >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
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
		if(result > 2 ** ((byteLength * 8) - 1)){
			result -= 2 ** (byteLength * 8);
		}
		return result;
	}
	readIntLE(offset = 0, byteLength){
		let result = this.readUIntLE(offset, byteLength);
		if(result > 2 ** ((byteLength * 8) - 1)){
			result -= 2 ** (byteLength * 8);
		}
		return result;
	}
	readUInt8(offset = 0){
		if(offset < 0 || offset >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		return this[offset];
	}
	readUInt16BE(offset = 0){
		if(offset < 0 || (offset + 1) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		let result = this[offset + 1];
		result += this[offset] << 8;
		return result;
	}
	readUInt16LE(offset = 0){
		if(offset < 0 || (offset + 1) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		let result = this[offset];
		result += this[offset + 1] << 8;
		return result;
	}
	readUInt32BE(offset = 0){
		if(offset < 0 || (offset + 3) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		let result = this[offset + 3];
		result += this[offset + 2] << 8;
		result += this[offset + 1] << 16;
		result += this[offset] * 0x1000000; // Bitshifting in JS uses _signed_ 32-bit ints 🤷🏻‍♂️
		return result;
	}
	readUInt32LE(offset = 0){
		if(offset < 0 || (offset + 3) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		let result = this[offset];
		result += this[offset + 1] << 8;
		result += this[offset + 2] << 16;
		result += this[offset + 3] * 0x1000000;
		return result;
	}
	readUIntBE(offset, byteLength){
		if(typeof byteLength !== "number"){
			throw new TypeError("\"byteLength\" must be a number");
		}
		if(offset < 0 || (offset + byteLength - 1) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		let mul = 1;
		let val = 0;
		for(let i = byteLength - 1; i >= 0; i -= 1){
			val += this[offset + i] * mul;
			mul *= 0x100;
		}
		return val;
	}
	readUIntLE(offset, byteLength){
		if(typeof byteLength !== "number"){
			throw new TypeError("\"byteLength\" must be a number");
		}
		if(offset < 0 || (offset + byteLength - 1) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		let mul = 1;
		let val = 0;
		for(let i = 0; i < byteLength; i += 1){
			val += this[offset + i] * mul;
			mul *= 0x100;
		}
		return val;
	}
	subarray(start = 0, end = this.length){
		const newArray = super.subarray(start, end);
		return new Buffer(newArray.buffer, newArray.byteOffset, newArray.byteLength);
	}
	slice(start = 0, end = this.length){
		return this.subarray(start, end);
	}
	swap16(){
		if((this.length % 2) !== 0){
			throw new RangeError("Buffer size must be a multiple of 16-bits");
		}
		for(let i = 0; i < this.length; i += 2){
			conversionBuffer2Bytes[0] = this[i];
			this[i] = this[i + 1];
			this[i + 1] = conversionBuffer2Bytes[0];
		}
		return this;
	}
	swap32(){
		if((this.length % 4) !== 0){
			throw new RangeError("Buffer size must be a multiple of 32-bits");
		}
		for(let i = 0; i < this.length; i += 4){
			conversionBuffer4Bytes[0] = this[i];
			conversionBuffer4Bytes[1] = this[i + 1];
			conversionBuffer4Bytes[2] = this[i + 2];
			conversionBuffer4Bytes[3] = this[i + 3];
			this[i] = conversionBuffer4Bytes[3];
			this[i + 1] = conversionBuffer4Bytes[2];
			this[i + 2] = conversionBuffer4Bytes[1];
			this[i + 3] = conversionBuffer4Bytes[0];
		}
		return this;
	}
	swap64(){
		if((this.length % 8) !== 0){
			throw new RangeError("Buffer size must be a multiple of 64-bits");
		}
		for(let i = 0; i < this.length; i += 8){
			for(let ii = 0; ii < 8; ii += 1){
				conversionBuffer8Bytes[ii] = this[i + ii];
			}
			conversionBuffer8Bytes.reverse();
			for(let ii = 0; ii < 8; ii += 1){
				this[i + ii] = conversionBuffer8Bytes[ii];
			}
		}
		return this;
	}
	toJSON(){
		return {
			data: [...this],
			type: "Buffer"
		};
	}
	toString(encoding = "utf8", start = 0, end = this.length){
		const buf = this.subarray(start, end);
		switch(encoding.toLowerCase()){
			case "utf8":
			case "utf-8":
				return decoder.decode(buf);
			case "utf16le":
			case "utf-16le":
			case "ucs2":
				return stringFromCharCodes(new Uint16Array(buf.buffer, buf.byteOffset, buf.byteLength / 2));
			case "latin1":
			case "binary":
				return stringFromCharCodes(buf);
			case "ascii":
				return stringFromCharCodes(buf.map(v => v & 127));
			case "base64":
				return btoa(stringFromCharCodes(buf));
			case "hex":{
				let str = "";
				for(let i = 0; i < buf.length; i += 1){
					const v = buf[i];
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
		if(typeof string !== "string"){
			throw new TypeError("argument must be a string");
		}
		const tmpBuffer = Buffer.from(string, encoding);
		tmpBuffer.copy(this, offset, 0, length);
		if(tmpBuffer.length < length){
			return tmpBuffer.length;
		}
		return length;
	}
	writeBigInt64BE(value, offset = 0){
		if(value < 0){
			value = bigIntConsts["18446744073709551616"] + value;
		}
		return this.writeBigUInt64BE(value, offset);
	}
	writeBigInt64LE(value, offset = 0){
		if(value < 0){
			value = bigIntConsts["18446744073709551616"] + value;
		}
		return this.writeBigUInt64LE(value, offset);
	}
	writeBigUInt64BE(value, offset = 0){
		if(offset < 0 || (offset + 7) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		this[offset + 7] = Number(value & bigIntConsts["255"]);
		this[offset + 6] = Number((value >> bigIntConsts["8"]) & bigIntConsts["255"]);
		this[offset + 5] = Number((value >> bigIntConsts["16"]) & bigIntConsts["255"]);
		this[offset + 4] = Number((value >> bigIntConsts["24"]) & bigIntConsts["255"]);
		this[offset + 3] = Number((value >> bigIntConsts["32"]) & bigIntConsts["255"]);
		this[offset + 2] = Number((value >> bigIntConsts["40"]) & bigIntConsts["255"]);
		this[offset + 1] = Number((value >> bigIntConsts["48"]) & bigIntConsts["255"]);
		this[offset] = Number((value >> bigIntConsts["56"]) & bigIntConsts["255"]);
		return offset + 8;
	}
	writeBigUInt64LE(value, offset = 0){
		if(offset < 0 || (offset + 7) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		this[offset] = Number(value & bigIntConsts["255"]);
		this[offset + 1] = Number((value >> bigIntConsts["8"]) & bigIntConsts["255"]);
		this[offset + 2] = Number((value >> bigIntConsts["16"]) & bigIntConsts["255"]);
		this[offset + 3] = Number((value >> bigIntConsts["24"]) & bigIntConsts["255"]);
		this[offset + 4] = Number((value >> bigIntConsts["32"]) & bigIntConsts["255"]);
		this[offset + 5] = Number((value >> bigIntConsts["40"]) & bigIntConsts["255"]);
		this[offset + 6] = Number((value >> bigIntConsts["48"]) & bigIntConsts["255"]);
		this[offset + 7] = Number((value >> bigIntConsts["56"]) & bigIntConsts["255"]);
		return offset + 8;
	}
	writeDoubleBE(value, offset = 0){
		if(offset < 0 || (offset + 7) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		conversionBufferFloat64[0] = value;
		conversionBuffer8Bytes.reverse();
		for(let i = 0; i < 8; i += 1){
			this[offset + i] = conversionBuffer8Bytes[i];
		}
		return offset + 8;
	}
	writeDoubleLE(value, offset = 0){
		if(offset < 0 || (offset + 7) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		conversionBufferFloat64[0] = value;
		for(let i = 0; i < 8; i += 1){
			this[offset + i] = conversionBuffer8Bytes[i];
		}
		return offset + 8;
	}
	writeFloatBE(value, offset = 0){
		if(offset < 0 || (offset + 3) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		conversionBufferFloat32[0] = value;
		conversionBuffer4Bytes.reverse();
		for(let i = 0; i < 4; i += 1){
			this[offset + i] = conversionBuffer4Bytes[i];
		}
		return offset + 4;
	}
	writeFloatLE(value, offset = 0){
		if(offset < 0 || (offset + 3) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		conversionBufferFloat32[0] = value;
		for(let i = 0; i < 4; i += 1){
			this[offset + i] = conversionBuffer4Bytes[i];
		}
		return offset + 4;
	}
	writeInt8(value, offset = 0){
		if(offset < 0 || offset >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
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
	writeIntBE(value, offset, byteLength){
		if(value < 0){
			value = (2 ** (byteLength * 8)) + value;
		}
		return this.writeUIntBE(value, offset, byteLength);
	}
	writeIntLE(value, offset, byteLength){
		if(value < 0){
			value = (2 ** (byteLength * 8)) + value;
		}
		return this.writeUIntLE(value, offset, byteLength);
	}
	writeUInt8(value, offset = 0){
		if(offset < 0 || offset >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		this[offset] = value;
		return offset + 1;
	}
	writeUInt16BE(value, offset = 0){
		if(offset < 0 || (offset + 1) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		this[offset + 1] = value & 255;
		this[offset] = (value >> 8) & 255;
		return offset + 2;
	}
	writeUInt16LE(value, offset = 0){
		if(offset < 0 || (offset + 1) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		this[offset] = value & 255;
		this[offset + 1] = (value >> 8) & 255;
		return offset + 2;
	}
	writeUInt32BE(value, offset = 0){
		if(offset < 0 || (offset + 3) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		this[offset + 3] = value & 255;
		this[offset + 2] = (value >> 8) & 255;
		this[offset + 1] = (value >> 16) & 255;
		this[offset] = (value >> 24) & 255;
		return offset + 4;
	}
	writeUInt32LE(value, offset = 0){
		if(offset < 0 || (offset + 3) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		this[offset] = value & 255;
		this[offset + 1] = (value >> 8) & 255;
		this[offset + 2] = (value >> 16) & 255;
		this[offset + 3] = (value >> 24) & 255;
		return offset + 4;
	}
	writeUIntBE(value, offset, byteLength){
		if(typeof byteLength !== "number"){
			throw new TypeError("\"byteLength\" must be a number");
		}
		if(typeof offset !== "number"){
			throw new TypeError("\"offset\" must be a number");
		}
		if(offset < 0 || (offset + byteLength - 1) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		let mul = 0x100 ** byteLength;
		for(let i = 0; i < byteLength; i += 1){
			mul /= 0x100;
			this[offset + i] = Math.floor(value / mul) & 255;
		}
		return offset + byteLength;
	}
	writeUIntLE(value, offset, byteLength){
		if(typeof byteLength !== "number"){
			throw new TypeError("\"byteLength\" must be a number");
		}
		if(typeof offset !== "number"){
			throw new TypeError("\"offset\" must be a number");
		}
		if(offset < 0 || (offset + byteLength - 1) >= this.length){
			throw new RangeError("Attempt to access memory outside buffer bounds");
		}
		let mul = 1;
		for(let i = 0; i < byteLength; i += 1){
			this[offset + i] = Math.floor(value / mul) & 255;
			mul *= 0x100;
		}
		return offset + byteLength;
	}
}
const fillBufferIfNotZero = function(buffer, fill, encoding){
	if(fill !== 0){
		buffer.fill(fill, 0, buffer.length, encoding);
	}
	return buffer;
};
let bufferPool = new Buffer(DEFAULT_POOL_SIZE);
let bufferPoolIndex = 0;
Buffer.alloc = function(size, fill = 0, encoding = "utf8"){
	if(typeof size !== "number"){
		throw new TypeError("size argument must be a number");
	}
	if(size === 0){
		return new Buffer(0);
	}
	if(size >= (Buffer.poolSize / 2)){
		return fillBufferIfNotZero(new Buffer(size), fill, encoding);
	}
	if((bufferPoolIndex + size) > Buffer.poolSize){
		// We have no way of knowing when previous buffers are GC'd so we can re-use a pool, oh well
		bufferPool = new Buffer(Buffer.poolSize);
		bufferPoolIndex = 0;
	}
	const newBuff = bufferPool.subarray(bufferPoolIndex, bufferPoolIndex + size);
	bufferPoolIndex += size;
	if((bufferPoolIndex % 8) !== 0){
		/* Keep the byte offsets a multiple of 4 so Buffer.prototype.equals is faster
		   Having it be a multiple of 8 will also allow for easy unions with the 64-bit array view types */
		bufferPoolIndex += 8 - (bufferPoolIndex % 8);
	}
	return fillBufferIfNotZero(newBuff, fill, encoding);
};
Buffer.allocUnsafe = Buffer.alloc; // Nothing unsafe about it since Buffers are always pre-zeroed on the browser
Buffer.allocUnsafeSlow = function(size){
	if(typeof size !== "number"){
		throw new TypeError("size argument must be a number");
	}
	return new Buffer(size);
};
/**
 * @param {string} str
 * @private
 */
const calculateUTF8LengthFromUTF16String = function(str){
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
		/* Fun fact: In the original 1993 UTF8 spec, it could go up to 6 bytes!
		   But since unicode codepoints were limited to 21 bits in 2003, the largest we should ever see is 4. */
		result += 4;
	}
	return result;
};
/**
 * @param {string} str
 * @private
 */
const calculateDecodedBase64Length = function(str){
	let result = str.length;
	while(result > 1 && str[result - 1] === "="){
		result -= 1;
	}
	return Math.floor(result * 0.75);
};
Buffer.byteLength = function(thing, encoding = "utf8"){
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
			case "ucs2":
				return thing.length * 2;
			case "base64":
				return calculateDecodedBase64Length(thing);
			case "hex":{
				return thing.length / 2;
			}
			default:
				throw new Error("Unknown encoding: " + encoding);
		}
	}else{
		return thing.length;
	}
};
Buffer.compare = function(buf1, buf2){
	if(!(buf1 instanceof Uint8Array)){
		throw new TypeError("buf1 must be a Buffer or Uint8Array");
	}
	if(Buffer.isBuffer(buf1)){
		return buf1.compare(buf2);
	}
	return Buffer.prototype.compare.call(buf1, buf2);
};
Buffer.concat = function(list, totalLength){
	if(!Array.isArray(list)){
		throw new TypeError("list argument must be an Array");
	}
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
		if(!(buff instanceof Uint8Array)){
			throw new TypeError("\"list[" + i + "]\" must be an instance of Buffer or Uint8Array");
		}
		resultBuffer.set(buff, resultOffset);
		resultOffset += buff.length;
	}
	return resultBuffer;
};
const invalidThingMessage = "The first argument must be of type string or an instance of Buffer, ArrayBuffer, or Array or an Array-like Object";
Buffer.from = function(arrayOrBufferOrString, byteOffsetOrEncoding, lengthOrEncoding){
	if(typeof arrayOrBufferOrString === "object"){
		if(
			// Apparently anything "array-like" can be used, this is my attempt to define what that means
			typeof arrayOrBufferOrString.length === "number" &&
			typeof arrayOrBufferOrString[Symbol.iterator] === "function"
		){
			return new Buffer(arrayOrBufferOrString);
		}
		if(arrayOrBufferOrString instanceof ArrayBuffer){
			return new Buffer(arrayOrBufferOrString, byteOffsetOrEncoding, lengthOrEncoding);
		}
		if(arrayOrBufferOrString.type !== "Buffer" || !Array.isArray(arrayOrBufferOrString.data)){
			throw new TypeError(invalidThingMessage);
		}
		return new Buffer(arrayOrBufferOrString.data);
	}else if(typeof arrayOrBufferOrString === "string"){
		if(typeof byteOffsetOrEncoding !== "string"){
			byteOffsetOrEncoding = "utf8";
		}
		switch(byteOffsetOrEncoding.toLowerCase()){
			case "utf8":
			case "utf-8":
				return new Buffer(encoder.encode(arrayOrBufferOrString));
			case "utf16le":
			case "utf-16le":
			case "ucs2":
				return new Buffer(
					(new Uint16Array([...arrayOrBufferOrString].map(v => v.charCodeAt(0)))).buffer
				);
			case "latin1":
			case "binary":
			case "ascii":
				return new Buffer([...arrayOrBufferOrString].map(v => v.charCodeAt(0)));
			case "base64":
				return new Buffer([...atob(arrayOrBufferOrString)].map(v => v.charCodeAt(0)));
			case "hex":{
				const newBuffer = new Buffer(arrayOrBufferOrString.length / 2);
				for(let i = 0; i < arrayOrBufferOrString.length; i += 2){
					newBuffer[i / 2] = parseInt(arrayOrBufferOrString.substring(i, i + 2), 16);
				}
				return newBuffer;
			}
			default:
				throw new Error("Unknown encoding: " + byteOffsetOrEncoding);
		}
	}
	throw new TypeError(invalidThingMessage);
};

Buffer.copyBytesFrom = function(view, offset = 0, length = view.length - offset){
	const viewAlignment = (() => {
		if(
			view instanceof Uint8Array ||
			view instanceof Int8Array ||
			view instanceof Uint8ClampedArray
		){
			return 1;
		}
		if(
			view instanceof Int16Array ||
			view instanceof Uint16Array
		){
			return 2;
		}
		if(
			view instanceof Int32Array ||
			view instanceof Uint32Array ||
			view instanceof Float32Array
		){
			return 4;
		}
		/* istanbul ignore next */
		if(
			view instanceof Float64Array ||
			(typeof BigInt64Array !== "undefined" && view instanceof BigInt64Array) ||
			(typeof BigInt64Array !== "undefined" && view instanceof BigUint64Array)
		){
			return 8;
		}
		/* istanbul ignore next */
		return 1;
	})();
	const newView = new Uint8Array(view.buffer, view.byteOffset + offset * viewAlignment, length * viewAlignment);
	return Buffer.from(newView); // Creates a new Buffer with contents copied from newView
};

Buffer.isBuffer = function(obj){
	return obj instanceof Buffer;
};
Buffer.isEncoding = function(encoding){
	if(typeof encoding !== "string"){
		return false;
	}
	return validEncodings.has(encoding.toLowerCase());
};
Buffer.poolSize = DEFAULT_POOL_SIZE;

module.exports = Buffer;
/* istanbul ignore next */
if(globalThis.Buffer === undefined){
	globalThis.Buffer = Buffer;
}
