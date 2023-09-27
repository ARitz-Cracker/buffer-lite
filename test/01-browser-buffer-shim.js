/* eslint-disable prefer-arrow-callback */
/* eslint-disable no-magic-numbers */
/* global BigInt */
const chai = require("chai");
chai.use(require("chai-as-promised"));
chai.use(require("chai-eventemitter"));
const expect = chai.expect;
const {Buffer: BrowserBuffer, SlowBuffer: BrowserSlowBuffer} = require("../browser");

// These would normally exist on the browser
globalThis.atob = function(b64Str){
	return Buffer.from(b64Str, "base64").toString("binary");
};
globalThis.btoa = function(binStr){
	return Buffer.from(binStr, "binary").toString("base64");
};

// TODO: Some of these tests are just "it works". While coverage is complete, someone should put proper descriptions...
describe("Browser Buffer shim", function(){
	it("supports the terrible deprecated practice of passing a STRING to the constructor", function(){
		expect(new BrowserBuffer("🤦‍♂️")).to.deep.equal(BrowserBuffer.from([
			240,
			159,
			164,
			166,
			226,
			128,
			141,
			226,
			153,
			130,
			239,
			184,
			143
		]));
	});
	describe("Buffer.alloc", function(){
		it("can return an empty buffer", function(){
			expect(BrowserBuffer.alloc(0)).to.deep.equal(new Uint8Array(0));
		});
		it("fills the buffer with zeros by default", function(){
			const buffer = BrowserBuffer.alloc(1337);
			for(let i = 0; i < 1337; i += 1){
				expect(buffer[i]).to.equal(0);
			}
		});
		it("can be filled with any byte value", function(){
			const buffer = BrowserBuffer.alloc(4000, 69);
			for(let i = 0; i < 4000; i += 1){
				expect(buffer[i]).to.equal(69);
			}
		});
		it("can be filled with any string value", function(){
			const buffer = BrowserBuffer.alloc(9001, "a");
			for(let i = 0; i < 9001; i += 1){
				expect(buffer[i]).to.equal("a".charCodeAt());
			}
		});
		it("can be filled with any string value with a specified encoding", function(){
			const buffer = BrowserBuffer.alloc(4001, "YQ==", "base64");
			for(let i = 0; i < 4001; i += 1){
				expect(buffer[i]).to.equal("a".charCodeAt());
			}
		});
		it("throws when first argument is not a number", function(){
			expect(
				BrowserBuffer.alloc.bind(BrowserBuffer, "0")
			).to.throw();
		});
	});
	describe("Buffer.allocUnsafe", function(){
		it("returns a buffer with the specified length", function(){
			expect(BrowserBuffer.allocUnsafe(1337).length).to.equal(1337);
		});
		it("throws when first argument is not a number", function(){
			expect(
				BrowserBuffer.allocUnsafe.bind(BrowserBuffer, "0")
			).to.throw();
		});
	});
	describe("Buffer.allocUnsafeSlow", function(){
		it("returns a buffer with an ArrayBuffer with the specified length", function(){
			expect(BrowserBuffer.allocUnsafeSlow(1337).buffer.byteLength).to.equal(1337);
		});
		it("throws when first argument is not a number", function(){
			expect(
				BrowserBuffer.allocUnsafeSlow.bind(BrowserBuffer, "0")
			).to.throw();
		});
	});
	describe("Buffer.byteLength", function(){
		it("calculates the length of UTF8 strings", function(){
			expect(
				BrowserBuffer.byteLength("Héllo worlᴅ! 😁", "utf8")
			).to.equal(20);
			expect(
				BrowserBuffer.byteLength("Héllo worlᴅ! 😁", "utf-8")
			).to.equal(20);
			expect(
				BrowserBuffer.byteLength("Héllo worlᴅ! 😁", "utf-8")
			).to.equal(20);
		});
		it("defaults to utf8", function(){
			expect(
				BrowserBuffer.byteLength("Héllo worlᴅ! 😁")
			).to.equal(20);
		});
		it("calculates the length of (extended) ascii strings", function(){
			expect(
				BrowserBuffer.byteLength("Héllo, world!", "ascii")
			).to.equal(13);
			expect(
				BrowserBuffer.byteLength("Héllo, world!", "binary")
			).to.equal(13);
			expect(
				BrowserBuffer.byteLength("Héllo, world!", "latin1")
			).to.equal(13);
		});
		it("calculates the byte length of utf16 strings", function(){
			expect(
				BrowserBuffer.byteLength("Héllo worlᴅ! 😁", "utf16le")
			).to.equal(30);
			expect(
				BrowserBuffer.byteLength("Héllo worlᴅ! 😁", "utf-16le")
			).to.equal(30);
			expect(
				BrowserBuffer.byteLength("Héllo worlᴅ! 😁", "ucs2")
			).to.equal(30);
		});
		it("calculates the decoded byte length of base64 strings", function(){
			expect(
				BrowserBuffer.byteLength("3lNtsw==", "base64")
			).to.equal(4);
		});
		it("calculates the decoded byte length of hex strings", function(){
			expect(
				BrowserBuffer.byteLength("0011", "hex")
			).to.equal(2);
		});
		it("throws when an invalid text encoding is encountered", function(){
			expect(
				BrowserBuffer.byteLength.bind(BrowserBuffer, "something", "something")
			).to.throw("Unknown encoding: something");
		});
		it("returns the length of the buffer if a buffer is passed", function(){
			expect(
				BrowserBuffer.byteLength(BrowserBuffer.alloc(4))
			).to.equal(4);
		});
	});
	describe("Buffer.compare", function(){
		it("Works when used in a sorting function (depends on Buffer#compare)", function(){
			const sortedArray = [
				BrowserBuffer.from("aaa"),
				BrowserBuffer.from("aaaa"),
				BrowserBuffer.from("aaab"),
				BrowserBuffer.from("aabb")
			];
			const unSortedArray = [
				BrowserBuffer.from("aabb"),
				BrowserBuffer.from("aaaa"),
				BrowserBuffer.from("aaa"),
				BrowserBuffer.from("aaab")
			];
			unSortedArray.sort(Buffer.compare);
			expect(unSortedArray).to.deep.equal(sortedArray);
		});
		it("Also works with Uint8Arrays", function(){
			const sortedArray = [
				BrowserBuffer.from("aaa"),
				BrowserBuffer.from("aaaa"),
				BrowserBuffer.from("aaab"),
				new Uint8Array([97, 97, 98, 98])
			];
			const unSortedArray = [
				new Uint8Array([97, 97, 98, 98]),
				BrowserBuffer.from("aaaa"),
				BrowserBuffer.from("aaa"),
				BrowserBuffer.from("aaab")
			];
			unSortedArray.sort(Buffer.compare);
			expect(unSortedArray).to.deep.equal(sortedArray);
			expect(
				BrowserBuffer.compare(new Uint8Array([0]), BrowserBuffer.from([1]))
			).to.equal(-1);
		});
		it("throws when either arguments aren't buffers or Uint8Arrays", function(){
			expect(
				BrowserBuffer.compare.bind(BrowserBuffer, BrowserBuffer.from("a"), "a")
			).to.throw();
			expect(
				BrowserBuffer.compare.bind(BrowserBuffer, "a", BrowserBuffer.from("a"))
			).to.throw();
		});
	});
	describe("Buffer.concat", function(){
		it("throws when an array is not given", function(){
			expect(BrowserBuffer.concat).to.throw("list argument must be an Array");
		});
		it("throws when there's a non-Uint8Array in the list", function(){
			expect(
				BrowserBuffer.concat.bind(BrowserBuffer, ["a"])
			).to.throw("\"list[0]\" must be an instance of Buffer or Uint8Array");
		});
		it("concatenate Uint8Arrays into a Buffer", function(){
			expect(
				BrowserBuffer.concat(
					[
						new Uint8Array([1, 1]),
						new Uint8Array([2, 2])
					],
					4
				)
			).to.deep.equal(
				BrowserBuffer.from([1, 1, 2, 2])
			);
		});
		it("concatenate Buffers into a Buffer", function(){
			expect(
				BrowserBuffer.concat(
					[
						BrowserBuffer.from([1, 1]),
						BrowserBuffer.from([2, 2])
					],
					4
				)
			).to.deep.equal(
				BrowserBuffer.from([1, 1, 2, 2])
			);
		});
		it("auto-determins the length of the resulting Buffer if a length is not specified", function(){
			expect(
				BrowserBuffer.concat(
					[
						BrowserBuffer.from([1, 1]),
						BrowserBuffer.from([2, 2])
					]
				)
			).to.deep.equal(
				BrowserBuffer.from([1, 1, 2, 2])
			);
		});
	});
	describe("Buffer.from", function(){
		it("creates buffers from Arrays and Array-like objects", function(){
			const arrayLike = {
				0: 42,
				1: 24,
				2: 12,
				length: 3,
				* [Symbol.iterator](){
					yield this[0];
					yield this[1];
					yield this[2];
				}
			};
			expect(
				BrowserBuffer.from(arrayLike)
			).to.deep.equal(
				BrowserBuffer.from([42, 24, 12])
			);
		});
		it("creates buffers given an ArrayBuffer, offset, and length", function(){
			const testBuffer = Buffer.from("aabbbcc");
			expect(
				BrowserBuffer.from(testBuffer.buffer, testBuffer.byteOffset + 2, 3)
			).to.deep.equal(
				BrowserBuffer.from([98, 98, 98])
			);
		});
		it("creates buffers given the result of a toJSON", function(){
			expect(
				BrowserBuffer.from({
					data: [1, 2, 3],
					type: "Buffer"
				})
			).to.deep.equal(
				BrowserBuffer.from([1, 2, 3])
			);
		});
		it("Throws when a strange and unknown object is given", function(){
			expect(
				BrowserBuffer.from.bind(BrowserBuffer, {})
			).to.throw();
			expect(
				BrowserBuffer.from.bind(BrowserBuffer, {type: "Buffer"})
			).to.throw();
			expect(
				BrowserBuffer.from.bind(BrowserBuffer, {data: "a", type: "Buffer"})
			).to.throw();
		});
		it("Throws when a number is given", function(){
			expect(
				BrowserBuffer.from.bind(BrowserBuffer, 0)
			).to.throw();
		});
		it("Handles UTF8 correctly", function(){
			expect(
				BrowserBuffer.from("Héllo worlᴅ! 😁", "utf8")
			).to.deep.equal(
				BrowserBuffer.from([
					72,
					195,
					169,
					108,
					108,
					111,
					32,
					119,
					111,
					114,
					108,
					225,
					180,
					133,
					33,
					32,
					240,
					159,
					152,
					129
				])
			);
			expect(
				BrowserBuffer.from("Héllo worlᴅ! 😁", "utf-8")
			).to.deep.equal(
				BrowserBuffer.from([
					72,
					195,
					169,
					108,
					108,
					111,
					32,
					119,
					111,
					114,
					108,
					225,
					180,
					133,
					33,
					32,
					240,
					159,
					152,
					129
				])
			);
		});
		it("uses utf8 by default when given a string", function(){
			expect(
				BrowserBuffer.from("Héllo worlᴅ! 😁")
			).to.deep.equal(
				BrowserBuffer.from([
					72,
					195,
					169,
					108,
					108,
					111,
					32,
					119,
					111,
					114,
					108,
					225,
					180,
					133,
					33,
					32,
					240,
					159,
					152,
					129
				])
			);
			expect(
				BrowserBuffer.from("Héllo worlᴅ! 😁", null)
			).to.deep.equal(
				BrowserBuffer.from([
					72,
					195,
					169,
					108,
					108,
					111,
					32,
					119,
					111,
					114,
					108,
					225,
					180,
					133,
					33,
					32,
					240,
					159,
					152,
					129
				])
			);
		});
		it("can create a Buffer from a string using the world's worst UTF encoding (16)", function(){
			/* UCS2 was a mistake, and because of over-investment into that in the 90s, we now have UTF16, which has
			   the worst of UTF8 and UTF32. Lack of direct indexability _and_ wasted space! */
			expect(
				BrowserBuffer.from("ab", "ucs2")
			).to.deep.equal(
				BrowserBuffer.from([97, 0, 98, 0])
			);
			expect(
				BrowserBuffer.from("ab", "utf16le")
			).to.deep.equal(
				BrowserBuffer.from([97, 0, 98, 0])
			);
			expect(
				BrowserBuffer.from("ab", "utf-16le")
			).to.deep.equal(
				BrowserBuffer.from([97, 0, 98, 0])
			);
		});
		it("can create a buffer from an ascii/latin1 string", function(){
			const compareBuf = BrowserBuffer.from([72, 233, 108, 108, 111]);
			expect(BrowserBuffer.from("Héllo", "ascii")).to.deep.equal(compareBuf);
			expect(BrowserBuffer.from("Héllo", "latin1")).to.deep.equal(compareBuf);
			expect(BrowserBuffer.from("Héllo", "binary")).to.deep.equal(compareBuf);
		});
		it("can decode base64 strings", function(){
			expect(
				BrowserBuffer.from("AQIDBA==", "base64")
			).to.deep.equal(
				BrowserBuffer.from([1, 2, 3, 4])
			);
		});
		it("can decode hex strings", function(){
			expect(
				BrowserBuffer.from("0102030f", "hex")
			).to.deep.equal(
				BrowserBuffer.from([1, 2, 3, 15])
			);
		});
		it("throws when given a string with an unknown encoding", function(){
			expect(
				BrowserBuffer.from.bind(BrowserBuffer, "asdf", "asdf")
			).to.throw("Unknown encoding: asdf");
		});
	});
	describe("Buffer.isBuffer", function(){
		it("tells you if a buffer is a buffer", function(){
			expect(
				BrowserBuffer.isBuffer(BrowserBuffer.from("a"))
			).to.equal(true);
		});
		it("tells you if a buffer not a buffer", function(){
			expect(
				BrowserBuffer.isBuffer(new Uint8Array([32]))
			).to.equal(false);
		});
	});
	describe("Buffer.isEncoding", function(){
		it("returns false when given a non-string", function(){
			expect(
				BrowserBuffer.isEncoding(1337)
			).to.equal(false);
			expect(
				BrowserBuffer.isEncoding(["utf8"])
			).to.equal(false);
		});
		it("returns true when given supported encoding methods", function(){
			expect(
				[
					"utf8",
					"utf-8",
					"utf/8",
					"ucs2",
					"utf16le",
					"utf-16le",
					"utf-16-le",
					"ascii",
					"binary",
					"latin1",
					"base64",
					"base32"
				].map(str => BrowserBuffer.isEncoding(str))
			).to.deep.equal([
				true,
				true,
				false,
				true,
				true,
				true,
				false,
				true,
				true,
				true,
				true,
				false
			]);
		});
		it("is case insensitive", function(){
			expect(
				[
					"UTF8",
					"UTF-8",
					"UtF-8",
					"UCS2",
					"UTF16LE",
					"UTF-16LE",
					"uTF-16Le",
					"ASCII",
					"BINARY",
					"LATIN1",
					"BASE64",
					"bAsE64"
				].map(str => BrowserBuffer.isEncoding(str))
			).to.deep.equal([
				true,
				true,
				true,
				true,
				true,
				true,
				true,
				true,
				true,
				true,
				true,
				true
			]);
		});
	});
	describe("Buffer#compare", function(){
		it("works", function(){
			expect(
				BrowserBuffer.from("aaa").compare(Buffer.from("aaa"))
			).to.equal(0);
			expect(
				BrowserBuffer.from("aaa").compare(Buffer.from("bbb"))
			).to.equal(-1);

			expect(
				BrowserBuffer.from("bbb").compare(Buffer.from("aaa"))
			).to.equal(1);
			expect(
				BrowserBuffer.from("bba").compare(Buffer.from("bbb"))
			).to.equal(-1);
			expect(
				BrowserBuffer.from("bbb").compare(Buffer.from("bba"))
			).to.equal(1);
			expect(
				BrowserBuffer.from("aaa").compare(Buffer.from("aa"))
			).to.equal(1);
			expect(
				BrowserBuffer.from("aa").compare(Buffer.from("aaa"))
			).to.equal(-1);
		});
	});
	describe("Buffer#copy", function(){
		it("works", function(){
			let sourceBuffer = BrowserBuffer.from("aaaaaaaa");
			let destBuffer = BrowserBuffer.from("bbbbbbbb");
			expect(
				sourceBuffer.copy(destBuffer)
			).to.equal(8);
			expect(destBuffer).to.deep.equal(BrowserBuffer.from("aaaaaaaa"));

			sourceBuffer = BrowserBuffer.from("aaaaaaaa");
			destBuffer = BrowserBuffer.from("bbbbbbbb");
			expect(
				sourceBuffer.copy(destBuffer, 4)
			).to.equal(4);
			expect(destBuffer).to.deep.equal(BrowserBuffer.from("bbbbaaaa"));

			sourceBuffer = BrowserBuffer.from("aaaacccc");
			destBuffer = BrowserBuffer.from("bbbbbbbb");
			expect(
				sourceBuffer.copy(destBuffer, 4, 2)
			).to.equal(4);
			expect(destBuffer).to.deep.equal(BrowserBuffer.from("bbbbaacc"));

			sourceBuffer = BrowserBuffer.from("aaaacccc");
			destBuffer = BrowserBuffer.from("bbbbbbbb");
			expect(
				sourceBuffer.copy(destBuffer, 4, 2, 4)
			).to.equal(2);
			expect(destBuffer).to.deep.equal(BrowserBuffer.from("bbbbaabb"));
		});
	});
	describe("Buffer#equals", function(){
		it("throws if the comparison buffer isn't a buffer", function(){
			expect(() => {
				BrowserBuffer.alloc(0).equals([]);
			}).to.throw();
		});
		it("returns true if both things are the same object", function(){
			const thing = BrowserBuffer.alloc(123);
			expect(thing.equals(thing)).to.equal(true);
		});
		it("returns false if both things differ in length", function(){
			expect(BrowserBuffer.alloc(12).equals(BrowserBuffer.alloc(123))).to.equal(false);
		});

		it("returns true if both things are empty buffers", function(){
			expect(BrowserBuffer.alloc(0).equals(BrowserBuffer.alloc(0))).to.equal(true);
		});
		it("returns true if both things have the same values", function(){
			expect(BrowserBuffer.alloc(10).equals(BrowserBuffer.alloc(10))).to.equal(true);
		});
		it("returns true if both things have the same value, with one thing being a Uint8Array", function(){
			expect(BrowserBuffer.alloc(10).equals(new Uint8Array(10))).to.equal(true);
		});
		it("returns false if values differ", function(){
			const buffer1 = BrowserBuffer.from("abcdefg");
			const buffer2 = BrowserBuffer.from("abcdeff");
			const buffer3 = BrowserBuffer.from("abddefg");
			expect(buffer1.equals(buffer2)).to.equal(false);
			expect(buffer1.equals(buffer3)).to.equal(false);
		});
		it("works with sub-buffers", function(){
			const buffer1 = BrowserBuffer.from("abcdefg").subarray(3);
			const buffer2 = BrowserBuffer.from("abcdefg").subarray(3);
			const buffer3 = BrowserBuffer.from("abcdeff").subarray(3);
			expect(buffer1.equals(buffer2)).to.equal(true);
			expect(buffer1.equals(buffer3)).to.equal(false);
		});
	});
	describe("Buffer#fill", function(){
		it("works for number values", function(){
			const newBuffer = BrowserBuffer.alloc(10);
			newBuffer.fill(69);
			for(let i = 0; i < 10; i += 1){
				expect(newBuffer[i]).to.equal(69);
			}
		});
		it("works for number values with a specified fill range", function(){
			const newBuffer = BrowserBuffer.alloc(10);
			newBuffer.fill(69, 1, 9);
			expect(newBuffer[0]).to.equal(0);
			for(let i = 1; i < 9; i += 1){
				expect(newBuffer[i]).to.equal(69);
			}
			expect(newBuffer[9]).to.equal(0);
		});
		it("works for buffer values", function(){
			const newBuffer = BrowserBuffer.alloc(10);
			newBuffer.fill(BrowserBuffer.from([69, 96]));
			expect(newBuffer).to.deep.equal(BrowserBuffer.from([
				69,
				96,
				69,
				96,
				69,
				96,
				69,
				96,
				69,
				96
			]));
		});
		it("works for buffer values with a specified fill range", function(){
			const newBuffer = BrowserBuffer.alloc(10);
			newBuffer.fill(BrowserBuffer.from([69, 96]), 1, 8);
			expect(newBuffer).to.deep.equal(BrowserBuffer.from([
				0,
				69,
				96,
				69,
				96,
				69,
				96,
				69,
				0,
				0
			]));
		});
		it("works for string values (utf8 default)", function(){
			const newBuffer = BrowserBuffer.alloc(10);
			newBuffer.fill("E`");
			expect(newBuffer).to.deep.equal(BrowserBuffer.from([
				69,
				96,
				69,
				96,
				69,
				96,
				69,
				96,
				69,
				96
			]));
		});
		it("works for string values (utf8 default) with a specified fill range", function(){
			const newBuffer = BrowserBuffer.alloc(10);
			newBuffer.fill("E`", 1, 8);
			expect(newBuffer).to.deep.equal(BrowserBuffer.from([
				0,
				69,
				96,
				69,
				96,
				69,
				96,
				69,
				0,
				0
			]));
		});
		it("works for string values (base64 specified)", function(){
			const newBuffer = BrowserBuffer.alloc(10);
			newBuffer.fill("RWA=", undefined, undefined, "base64");
			expect(newBuffer).to.deep.equal(BrowserBuffer.from([
				69,
				96,
				69,
				96,
				69,
				96,
				69,
				96,
				69,
				96
			]));
		});
		it("works for string values (base64 specified) with a specified fill range", function(){
			const newBuffer = BrowserBuffer.alloc(10);
			newBuffer.fill("RWA=", 1, 8, "base64");
			expect(newBuffer).to.deep.equal(BrowserBuffer.from([
				0,
				69,
				96,
				69,
				96,
				69,
				96,
				69,
				0,
				0
			]));
		});
		it("works for Uint8Array values", function(){
			const newBuffer = BrowserBuffer.alloc(10);
			newBuffer.fill(new Uint8Array([69, 96]));
			expect(newBuffer).to.deep.equal(BrowserBuffer.from([
				69,
				96,
				69,
				96,
				69,
				96,
				69,
				96,
				69,
				96
			]));
		});
		it("throws when given an invalid fill parameter", function(){
			const newBuffer = BrowserBuffer.alloc(10);
			expect(newBuffer.fill.bind(newBuffer, {})).to.throw();
		});
	});
	describe("Buffer#includes", function(){
		it("works (see Buffer#indexOf for more thorough testing)", function(){
			expect(BrowserBuffer.from([1, 2, 3, 1, 2, 3]).includes(2)).to.equal(true);
			expect(BrowserBuffer.from([1, 2, 3, 1, 2, 3]).includes(4)).to.equal(false);
		});
	});
	describe("Buffer#indexOf", function(){
		it("works (number values)", function(){
			const testBuffer = BrowserBuffer.from([1, 2, 3, 1, 2, 3]);
			expect(testBuffer.indexOf(2)).to.equal(1);
			expect(testBuffer.indexOf(2, 3)).to.equal(4);
			expect(testBuffer.indexOf(4)).to.equal(-1);
		});
		it("works with negative start-search values", function(){
			const testBuffer = BrowserBuffer.from([1, 2, 3, 1, 2, 3]);
			expect(testBuffer.indexOf(2, -2)).to.equal(4);
		});

		it("works (buffer values)", function(){
			const testBuffer = BrowserBuffer.from([1, 2, 3, 1, 2, 3]);
			expect(testBuffer.indexOf(BrowserBuffer.from([1, 2]))).to.equal(0);
			expect(testBuffer.indexOf(BrowserBuffer.from([1, 2]), 1)).to.equal(3);
			expect(testBuffer.indexOf(BrowserBuffer.from([1, 3]), 1)).to.equal(-1);
		});
		it("works (Uint8Array values)", function(){
			const testBuffer = BrowserBuffer.from([1, 2, 3, 1, 2, 3]);
			expect(testBuffer.indexOf(new Uint8Array([1, 2]))).to.equal(0);
			expect(testBuffer.indexOf(new Uint8Array([1, 2]), 1)).to.equal(3);
			expect(testBuffer.indexOf(new Uint8Array([1, 3]), 1)).to.equal(-1);
		});
		it("works (string values, utf8 default)", function(){
			const testBuffer = BrowserBuffer.from("abcabc");
			expect(testBuffer.indexOf("ab")).to.equal(0);
			expect(testBuffer.indexOf("ab", 1)).to.equal(3);
			expect(testBuffer.indexOf("ac", 1)).to.equal(-1);
		});
		it("works (string values, non-utf8 specified)", function(){
			const testBuffer = BrowserBuffer.from([1, 2, 3, 1, 2, 3]);
			expect(testBuffer.indexOf("AQI=", 0, "base64")).to.equal(0);
			expect(testBuffer.indexOf("AQI=", 1, "base64")).to.equal(3);
			expect(testBuffer.indexOf("AQZ=", 0, "base64")).to.equal(-1);
		});
		it("throws when given an invalid value", function(){
			const testBuffer = BrowserBuffer.alloc(0);
			expect(testBuffer.indexOf.bind(testBuffer, {})).to.throw();
		});
	});

	describe("Buffer#lastIndexOf", function(){
		it("works (number values)", function(){
			const testBuffer = BrowserBuffer.from([1, 2, 3, 1, 2, 3]);
			expect(testBuffer.lastIndexOf(2)).to.equal(4);
			expect(testBuffer.lastIndexOf(2, 3)).to.equal(1);
			expect(testBuffer.lastIndexOf(4)).to.equal(-1);
		});
		it("works with negative start-search values", function(){
			const testBuffer = BrowserBuffer.from([1, 2, 3, 1, 2, 3]);
			expect(testBuffer.lastIndexOf(2, -3)).to.equal(1);
		});

		it("works (buffer values)", function(){
			const testBuffer = BrowserBuffer.from([1, 2, 3, 1, 2, 3]);
			expect(testBuffer.lastIndexOf(BrowserBuffer.from([1, 2]))).to.equal(3);
			expect(testBuffer.lastIndexOf(BrowserBuffer.from([1, 2]), 1)).to.equal(0);
			expect(testBuffer.lastIndexOf(BrowserBuffer.from([1, 3]))).to.equal(-1);
		});
		it("works (Uint8Array values)", function(){
			const testBuffer = BrowserBuffer.from([1, 2, 3, 1, 2, 3]);
			expect(testBuffer.lastIndexOf(new Uint8Array([1, 2]))).to.equal(3);
			expect(testBuffer.lastIndexOf(new Uint8Array([1, 2]), 1)).to.equal(0);
			expect(testBuffer.lastIndexOf(new Uint8Array([1, 3]))).to.equal(-1);
		});
		it("works (string values, utf8 default)", function(){
			const testBuffer = BrowserBuffer.from("abcabc");
			expect(testBuffer.lastIndexOf("ab")).to.equal(3);
			expect(testBuffer.lastIndexOf("ab", 1)).to.equal(0);
			expect(testBuffer.lastIndexOf("ac")).to.equal(-1);
		});
		it("works (string values, non-utf8 specified)", function(){
			const testBuffer = BrowserBuffer.from([1, 2, 3, 1, 2, 3]);
			expect(testBuffer.lastIndexOf("AQI=", testBuffer.length, "base64")).to.equal(3);
			expect(testBuffer.lastIndexOf("AQI=", 1, "base64")).to.equal(0);
			expect(testBuffer.lastIndexOf("AQZ=", testBuffer.length, "base64")).to.equal(-1);
		});
		it("throws when given an invalid value", function(){
			const testBuffer = BrowserBuffer.alloc(0);
			expect(testBuffer.lastIndexOf.bind(testBuffer, {})).to.throw();
		});
	});
	describe("Buffer#map", function(){
		it("works", function(){
			const mappedBuffer = BrowserBuffer.from([
				2,
				4,
				6
			]).map(v => v / 2);
			expect(mappedBuffer).to.deep.equal(
				BrowserBuffer.from([1, 2, 3])
			);
			expect(mappedBuffer).to.be.an.instanceOf(BrowserBuffer);
		});
	});
	describe("Buffer#readBigInt64BE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readBigInt64BE()).to.equal(nodeBuffer.readBigInt64BE());
			expect(browserBuffer.readBigInt64BE(3)).to.equal(nodeBuffer.readBigInt64BE(3));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22]);
			expect(browserBuffer.readBigInt64BE.bind(browserBuffer)).to.throw();
		});
	});
	describe("Buffer#readBigInt64LE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readBigInt64LE()).to.equal(nodeBuffer.readBigInt64LE());
			expect(browserBuffer.readBigInt64LE(3)).to.equal(nodeBuffer.readBigInt64LE(3));
			expect(browserBuffer.readBigInt64LE(4)).to.equal(nodeBuffer.readBigInt64LE(4));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22]);
			expect(browserBuffer.readBigInt64LE.bind(browserBuffer)).to.throw();
		});
	});
	describe("Buffer#readBigUInt64BE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readBigUInt64BE()).to.equal(nodeBuffer.readBigUInt64BE());
			expect(browserBuffer.readBigUInt64BE(3)).to.equal(nodeBuffer.readBigUInt64BE(3));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22]);
			expect(browserBuffer.readBigUInt64BE.bind(browserBuffer)).to.throw();
		});
	});
	describe("Buffer#readBigUInt64LE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readBigUInt64LE()).to.equal(nodeBuffer.readBigUInt64LE());
			expect(browserBuffer.readBigUInt64LE(3)).to.equal(nodeBuffer.readBigUInt64LE(3));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22]);
			expect(browserBuffer.readBigUInt64LE.bind(browserBuffer)).to.throw();
		});
	});
	describe("Buffer#readDoubleBE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readDoubleBE()).to.equal(nodeBuffer.readDoubleBE());
			expect(browserBuffer.readDoubleBE(3)).to.equal(nodeBuffer.readDoubleBE(3));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22]);
			expect(browserBuffer.readDoubleBE.bind(browserBuffer)).to.throw();
		});
	});
	describe("Buffer#readDoubleLE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readDoubleLE()).to.equal(nodeBuffer.readDoubleLE());
			expect(browserBuffer.readDoubleLE(3)).to.equal(nodeBuffer.readDoubleLE(3));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22]);
			expect(browserBuffer.readDoubleLE.bind(browserBuffer)).to.throw();
		});
	});
	describe("Buffer#readFloatBE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readFloatBE()).to.equal(nodeBuffer.readFloatBE());
			expect(browserBuffer.readFloatBE(7)).to.equal(nodeBuffer.readFloatBE(7));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22]);
			expect(browserBuffer.readFloatBE.bind(browserBuffer, 10)).to.throw();
		});
	});
	describe("Buffer#readFloatLE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readFloatLE()).to.equal(nodeBuffer.readFloatLE());
			expect(browserBuffer.readFloatLE(7)).to.equal(nodeBuffer.readFloatLE(7));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22]);
			expect(browserBuffer.readFloatLE.bind(browserBuffer, 10)).to.throw();
		});
	});
	describe("Buffer#readInt8", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readInt8()).to.equal(nodeBuffer.readInt8());
			expect(browserBuffer.readInt8(3)).to.equal(nodeBuffer.readInt8(3));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22]);
			expect(browserBuffer.readInt8.bind(browserBuffer, 10)).to.throw();
		});
	});
	describe("Buffer#readInt16BE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readInt16BE()).to.equal(nodeBuffer.readInt16BE());
			expect(browserBuffer.readInt16BE(2)).to.equal(nodeBuffer.readInt16BE(2));
			expect(browserBuffer.readInt16BE(3)).to.equal(nodeBuffer.readInt16BE(3));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22]);
			expect(browserBuffer.readInt16BE.bind(browserBuffer, 10)).to.throw();
		});
	});
	describe("Buffer#readInt16LE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readInt16LE()).to.equal(nodeBuffer.readInt16LE());
			expect(browserBuffer.readInt16LE(2)).to.equal(nodeBuffer.readInt16LE(2));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22]);
			expect(browserBuffer.readInt16LE.bind(browserBuffer, 10)).to.throw();
		});
	});
	describe("Buffer#readInt32BE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readInt32BE()).to.equal(nodeBuffer.readInt32BE());
			expect(browserBuffer.readInt32BE(2)).to.equal(nodeBuffer.readInt32BE(2));
			expect(browserBuffer.readInt32BE(4)).to.equal(nodeBuffer.readInt32BE(4));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222]);
			expect(browserBuffer.readInt32BE.bind(browserBuffer, 10)).to.throw();
		});
	});
	describe("Buffer#readInt32LE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readInt32LE()).to.equal(nodeBuffer.readInt32LE());
			expect(browserBuffer.readInt32LE(2)).to.equal(nodeBuffer.readInt32LE(2));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222]);
			expect(browserBuffer.readInt32LE.bind(browserBuffer, 10)).to.throw();
		});
	});
	describe("Buffer#readIntBE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readIntBE(0, 5)).to.equal(nodeBuffer.readIntBE(0, 5));
			expect(browserBuffer.readIntBE(2, 5)).to.equal(nodeBuffer.readIntBE(2, 5));
			expect(browserBuffer.readIntBE(4, 6)).to.equal(nodeBuffer.readIntBE(4, 6));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222]);
			expect(browserBuffer.readIntBE.bind(browserBuffer, 10, 5)).to.throw();
		});
		it("throws when offset is unspecified", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222]);
			expect(browserBuffer.readIntBE.bind(browserBuffer)).to.throw();
		});
	});
	describe("Buffer#readIntLE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readIntLE(0, 5)).to.equal(nodeBuffer.readIntLE(0, 5));
			expect(browserBuffer.readIntLE(3, 5)).to.equal(nodeBuffer.readIntLE(3, 5));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222]);
			expect(browserBuffer.readIntLE.bind(browserBuffer, 10, 5)).to.throw();
		});

		it("throws when offset is unspecified", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222]);
			expect(browserBuffer.readIntLE.bind(browserBuffer)).to.throw();
		});
	});
	describe("Buffer#readUInt8", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readUInt8()).to.equal(nodeBuffer.readUInt8());
			expect(browserBuffer.readUInt8(3)).to.equal(nodeBuffer.readUInt8(3));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22]);
			expect(browserBuffer.readUInt8.bind(browserBuffer, 10)).to.throw();
		});
	});
	describe("Buffer#readUInt16BE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readUInt16BE()).to.equal(nodeBuffer.readUInt16BE());
			expect(browserBuffer.readUInt16BE(2)).to.equal(nodeBuffer.readUInt16BE(2));
			expect(browserBuffer.readUInt16BE(3)).to.equal(nodeBuffer.readUInt16BE(3));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22]);
			expect(browserBuffer.readUInt16BE.bind(browserBuffer, 10)).to.throw();
		});
	});
	describe("Buffer#readUInt16LE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readUInt16LE()).to.equal(nodeBuffer.readUInt16LE());
			expect(browserBuffer.readUInt16LE(2)).to.equal(nodeBuffer.readUInt16LE(2));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 22]);
			expect(browserBuffer.readUInt16LE.bind(browserBuffer, 10)).to.throw();
		});
	});
	describe("Buffer#readUInt32BE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readUInt32BE()).to.equal(nodeBuffer.readUInt32BE());
			expect(browserBuffer.readUInt32BE(2)).to.equal(nodeBuffer.readUInt32BE(2));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222]);
			expect(browserBuffer.readUInt32BE.bind(browserBuffer, 10)).to.throw();
		});
	});
	describe("Buffer#readUInt32LE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readUInt32LE()).to.equal(nodeBuffer.readUInt32LE());
			expect(browserBuffer.readUInt32LE(2)).to.equal(nodeBuffer.readUInt32LE(2));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222]);
			expect(browserBuffer.readUInt32LE.bind(browserBuffer, 10)).to.throw();
		});
	});
	describe("Buffer#readUIntBE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readUIntBE(0, 5)).to.equal(nodeBuffer.readUIntBE(0, 5));
			expect(browserBuffer.readUIntBE(2, 5)).to.equal(nodeBuffer.readUIntBE(2, 5));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222]);
			expect(browserBuffer.readUIntBE.bind(browserBuffer, 10, 5)).to.throw();
		});
		it("throws when offset is unspecified", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222]);
			expect(browserBuffer.readUIntBE.bind(browserBuffer)).to.throw();
		});
	});
	describe("Buffer#readUIntLE", function(){
		it("matches NodeJS Implementation", function(){
			const nodeBuffer = Buffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222, 106, 96, 88, 211, 157, 74, 139, 23]);
			expect(browserBuffer.readUIntLE(0, 5)).to.equal(nodeBuffer.readUIntLE(0, 5));
			expect(browserBuffer.readUIntLE(3, 5)).to.equal(nodeBuffer.readUIntLE(3, 5));
		});
		it("throws when attempting to read a value out of bounds", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222]);
			expect(browserBuffer.readUIntLE.bind(browserBuffer, 10, 5)).to.throw();
		});

		it("throws when offset is unspecified", function(){
			const browserBuffer = BrowserBuffer.from([204, 251, 222, 222]);
			expect(browserBuffer.readUIntLE.bind(browserBuffer)).to.throw();
		});
	});
	describe("Buffer#subarray", function(){
		it("works", function(){
			const baseBuf = BrowserBuffer.from([1, 2, 3, 4]);
			expect(baseBuf.subarray()).to.deep.equal(baseBuf);
			expect(baseBuf.subarray(1)).to.deep.equal(BrowserBuffer.from([2, 3, 4]));
			expect(baseBuf.subarray(1, 3)).to.deep.equal(BrowserBuffer.from([2, 3]));
			expect(baseBuf.subarray(1, 3).buffer).to.equal(baseBuf.buffer);
			expect(baseBuf.subarray(1, 3)).to.be.a.instanceOf(BrowserBuffer);
		});
	});
	describe("Buffer#slice", function(){
		it("is identical to Buffer#subarray", function(){
			const baseBuf = BrowserBuffer.from([1, 2, 3, 4]);
			expect(baseBuf.slice()).to.deep.equal(baseBuf);
			expect(baseBuf.slice(1)).to.deep.equal(BrowserBuffer.from([2, 3, 4]));
			expect(baseBuf.slice(1, 3)).to.deep.equal(BrowserBuffer.from([2, 3]));
			expect(baseBuf.slice(1, 3).buffer).to.equal(baseBuf.buffer);
			expect(baseBuf.slice(1, 3)).to.be.a.instanceOf(BrowserBuffer);
		});
	});
	describe("Buffer#swap16", function(){
		it("works", function(){
			expect(BrowserBuffer.from([1, 2, 3, 4]).swap16()).to.deep.equal(BrowserBuffer.from([2, 1, 4, 3]));
		});
		it("throws when the buffer isn't a multiple of 16 bits", function(){
			const testBuf = BrowserBuffer.from([1, 2, 3]);
			expect(testBuf.swap16.bind(testBuf)).to.throw();
		});
	});
	describe("Buffer#swap32", function(){
		it("works", function(){
			expect(BrowserBuffer.from([1, 2, 3, 4, 5, 6, 7, 8]).swap32())
				.to.deep.equal(BrowserBuffer.from([4, 3, 2, 1, 8, 7, 6, 5]));
		});
		it("throws when the buffer isn't a multiple of 32 bits", function(){
			const testBuf = BrowserBuffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);
			expect(testBuf.swap32.bind(testBuf)).to.throw();
		});
	});
	describe("Buffer#swap64", function(){
		it("works", function(){
			expect(BrowserBuffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]).swap64())
				.to.deep.equal(BrowserBuffer.from([8, 7, 6, 5, 4, 3, 2, 1, 16, 15, 14, 13, 12, 11, 10, 9]));
		});
		it("throws when the buffer isn't a multiple of 32 bits", function(){
			const testBuf = BrowserBuffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]);
			expect(testBuf.swap64.bind(testBuf)).to.throw();
		});
	});
	describe("Buffer#toJSON", function(){
		it("works", function(){
			expect(
				BrowserBuffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9]).toJSON()
			).to.deep.equal({
				data: [1, 2, 3, 4, 5, 6, 7, 8, 9],
				type: "Buffer"
			});
		});
	});
	describe("Buffer#toString", function(){
		it("defaults to UTF8", function(){
			expect(
				BrowserBuffer.from(
					[72, 195, 169, 108, 108, 111, 32, 119, 111, 114, 108, 225, 180, 133, 33, 32, 240, 159, 152, 129]
				).toString()
			).to.equal("Héllo worlᴅ! 😁");
		});
		it("works with UTF8", function(){
			expect(
				BrowserBuffer.from(
					[72, 195, 169, 108, 108, 111, 32, 119, 111, 114, 108, 225, 180, 133, 33, 32, 240, 159, 152, 129]
				).toString("utf8")
			).to.equal("Héllo worlᴅ! 😁");
			expect(
				BrowserBuffer.from(
					[72, 195, 169, 108, 108, 111, 32, 119, 111, 114, 108, 225, 180, 133, 33, 32, 240, 159, 152, 129]
				).toString("utf-8")
			).to.equal("Héllo worlᴅ! 😁");
		});
		it("can stringify a range", function(){
			expect(
				BrowserBuffer.from(
					[72, 195, 169, 108, 108, 111, 32, 119, 111, 114, 108, 225, 180, 133, 33, 32, 240, 159, 152, 129]
				).toString("utf8", 1, 15)
			).to.equal("éllo worlᴅ!");
		});
		it("works with UTF16", function(){
			const utf16buf = BrowserBuffer.from(
				[
					72,
					0,
					233,
					0,
					108,
					0,
					108,
					0,
					111,
					0,
					32,
					0,
					119,
					0,
					111,
					0,
					114,
					0,
					108,
					0,
					5,
					29,
					33,
					0,
					32,
					0,
					61,
					216,
					1,
					222
				]
			);
			expect(utf16buf.toString("ucs2")).to.equal("Héllo worlᴅ! 😁");
			expect(utf16buf.toString("utf16le")).to.equal("Héllo worlᴅ! 😁");
			expect(utf16buf.toString("utf-16le")).to.equal("Héllo worlᴅ! 😁");
		});
		it("works with latin1", function(){
			const asciibuf = BrowserBuffer.from([104, 233, 108, 108, 111]);
			expect(asciibuf.toString("latin1")).to.equal("héllo");
			expect(asciibuf.toString("binary")).to.equal("héllo");
		});
		it("works with ascii (strips out highest bit)", function(){
			const asciibuf = BrowserBuffer.from([104, 233, 108, 108, 111]);
			expect(asciibuf.toString("ascii")).to.equal("hillo");
		});
		it("encodes to base64", function(){
			const asciibuf = BrowserBuffer.from([104, 233, 108, 108, 111]);
			expect(asciibuf.toString("base64")).to.equal("aOlsbG8=");
		});
		it("encodes to hex", function(){
			const asciibuf = BrowserBuffer.from([104, 233, 108, 108, 111, 7]);
			expect(asciibuf.toString("hex")).to.equal("68e96c6c6f07");
		});
		it("throws when it encounters an unknown encoding", function(){
			const asciibuf = BrowserBuffer.from([104, 233, 108, 108, 111, 7]);
			expect(asciibuf.toString.bind(asciibuf, "something")).to.throw();
		});
		it("can toString very long buffers", function(){
			const array = new Array(1024 * 1024);
			array.fill("a".charCodeAt(0));
			const asciibuf = BrowserBuffer.from(array);
			expect(asciibuf.toString("ascii")).to.equal("a".repeat(1024 * 1024));
		});
	});
	describe("Buffer#write", function(){
		it("works", function(){
			const buff = BrowserBuffer.from("aaaaaaaa");
			buff.write("bb");
			expect(buff.toString()).to.equal("bbaaaaaa");
			buff.write("bb", 2);
			expect(buff.toString()).to.equal("bbbbaaaa");
			buff.write("bb", 4, 1);
			expect(buff.toString()).to.equal("bbbbbaaa", "utf8");
			expect(buff.write.bind(buff, new Uint8Array([32]))).to.throw("must be a string");
		});
	});
	describe("Buffer#writeBigInt64BE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeBigInt64BE(BigInt("1337"))).to.equal(nodeBuffer.writeBigInt64BE(BigInt("1337")));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeBigInt64BE(BigInt("-1337"), 2)).to.equal(nodeBuffer.writeBigInt64BE(BigInt("-1337"), 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeBigInt64BE.bind(browserBuffer, BigInt("1337"), 9)).to.throw();
		});
	});
	describe("Buffer#writeBigInt64LE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeBigInt64LE(BigInt("1337"))).to.equal(nodeBuffer.writeBigInt64LE(BigInt("1337")));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeBigInt64LE(BigInt("-1337"), 2)).to.equal(nodeBuffer.writeBigInt64LE(BigInt("-1337"), 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeBigInt64LE.bind(browserBuffer, BigInt("1337"), 9)).to.throw();
		});
	});
	describe("Buffer#writeBigUInt64BE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeBigUInt64BE(BigInt("1337"))).to.equal(nodeBuffer.writeBigUInt64BE(BigInt("1337")));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeBigUInt64BE(BigInt("1337"), 2)).to.equal(nodeBuffer.writeBigUInt64BE(BigInt("1337"), 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeBigInt64BE.bind(browserBuffer, BigInt("1337"), 9)).to.throw();
		});
	});
	describe("Buffer#writeBigUInt64LE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeBigUInt64LE(BigInt("1337"))).to.equal(nodeBuffer.writeBigUInt64LE(BigInt("1337")));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeBigUInt64LE(BigInt("1337"), 2)).to.equal(nodeBuffer.writeBigUInt64LE(BigInt("1337"), 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeBigUInt64LE.bind(browserBuffer, BigInt("1337"), 9)).to.throw();
		});
	});
	describe("Buffer#writeDoubleBE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeDoubleBE(1337.7)).to.equal(nodeBuffer.writeDoubleBE(1337.7));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeDoubleBE(-1337.7, 2)).to.equal(nodeBuffer.writeDoubleBE(-1337.7, 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeDoubleBE.bind(browserBuffer, 1337.7, 9)).to.throw();
		});
	});
	describe("Buffer#writeDoubleLE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeDoubleLE(1337.7)).to.equal(nodeBuffer.writeDoubleLE(1337.7));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeDoubleLE(-1337.7, 2)).to.equal(nodeBuffer.writeDoubleLE(-1337.7, 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeDoubleLE.bind(browserBuffer, 1337.7, 9)).to.throw();
		});
	});
	describe("Buffer#writeFloatBE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeFloatBE(1337.7)).to.equal(nodeBuffer.writeFloatBE(1337.7));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeFloatBE(-1337.7, 2)).to.equal(nodeBuffer.writeFloatBE(-1337.7, 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeFloatBE.bind(browserBuffer, 1337.7, 9)).to.throw();
		});
	});
	describe("Buffer#writeFloatLE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeFloatLE(1337.7)).to.equal(nodeBuffer.writeFloatLE(1337.7));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeFloatLE(-1337.7, 2)).to.equal(nodeBuffer.writeFloatLE(-1337.7, 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeFloatLE.bind(browserBuffer, 1337.7, 9)).to.throw();
		});
	});
	describe("Buffer#writeInt8", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeInt8(37)).to.equal(nodeBuffer.writeInt8(37));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeInt8(-37, 2)).to.equal(nodeBuffer.writeInt8(-37, 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeInt8.bind(browserBuffer, 37, 11)).to.throw();
		});
	});
	describe("Buffer#writeInt16BE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeInt16BE(1337)).to.equal(nodeBuffer.writeInt16BE(1337));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeInt16BE(-1337, 2)).to.equal(nodeBuffer.writeInt16BE(-1337, 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeInt16BE.bind(browserBuffer, 1337, 9)).to.throw();
		});
	});
	describe("Buffer#writeInt16LE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeInt16LE(1337)).to.equal(nodeBuffer.writeInt16LE(1337));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeInt16LE(-1337, 2)).to.equal(nodeBuffer.writeInt16LE(-1337, 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeInt16LE.bind(browserBuffer, 1337, 9)).to.throw();
		});
	});
	describe("Buffer#writeInt32BE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeInt32BE(1337)).to.equal(nodeBuffer.writeInt32BE(1337));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeInt32BE(-1337, 2)).to.equal(nodeBuffer.writeInt32BE(-1337, 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeInt32BE.bind(browserBuffer, 1337, 9)).to.throw();
		});
	});
	describe("Buffer#writeInt32LE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeInt32LE(1337)).to.equal(nodeBuffer.writeInt32LE(1337));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeInt32LE(-1337, 2)).to.equal(nodeBuffer.writeInt32LE(-1337, 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeInt32LE.bind(browserBuffer, 1337, 9)).to.throw();
		});
	});
	describe("Buffer#writeIntBE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeIntBE(1337, 0, 5)).to.equal(nodeBuffer.writeIntBE(1337, 0, 5));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeIntBE(-1337, 2, 5)).to.equal(nodeBuffer.writeIntBE(-1337, 2, 5));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeIntBE.bind(browserBuffer, 1337, 9, 5)).to.throw();
		});
		it("throws an error if offset is unspecified", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeIntBE.bind(browserBuffer, 1337, undefined, 5)).to.throw();
		});
		it("throws an error if byteLength is unspecified", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeIntBE.bind(browserBuffer, 1337, 0)).to.throw();
		});
	});
	describe("Buffer#writeIntLE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeIntLE(1337, 0, 5)).to.equal(nodeBuffer.writeIntLE(1337, 0, 5));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeIntLE(-1337, 2, 5)).to.equal(nodeBuffer.writeIntLE(-1337, 2, 5));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeIntLE.bind(browserBuffer, 1337, 9, 5)).to.throw();
		});
		it("throws an error if offset is unspecified", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeIntLE.bind(browserBuffer, 1337, undefined, 5)).to.throw();
		});
		it("throws an error if byteLength is unspecified", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeIntLE.bind(browserBuffer, 1337, 0)).to.throw();
		});
	});
	describe("Buffer#writeUInt8", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeUInt8(37)).to.equal(nodeBuffer.writeUInt8(37));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeUInt8(37, 2)).to.equal(nodeBuffer.writeUInt8(37, 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeUInt8.bind(browserBuffer, 37, 11)).to.throw();
		});
	});
	describe("Buffer#writeUInt16BE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeUInt16BE(1337)).to.equal(nodeBuffer.writeUInt16BE(1337));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeUInt16BE(1337, 2)).to.equal(nodeBuffer.writeUInt16BE(1337, 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeUInt16BE.bind(browserBuffer, 1337, 9)).to.throw();
		});
	});
	describe("Buffer#writeUInt16LE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeUInt16LE(1337)).to.equal(nodeBuffer.writeUInt16LE(1337));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeUInt16LE(1337, 2)).to.equal(nodeBuffer.writeUInt16LE(1337, 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeUInt16LE.bind(browserBuffer, 1337, 9)).to.throw();
		});
	});
	describe("Buffer#writeUInt32BE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeUInt32BE(1337)).to.equal(nodeBuffer.writeUInt32BE(1337));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeUInt32BE(1337, 2)).to.equal(nodeBuffer.writeUInt32BE(1337, 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeUInt32BE.bind(browserBuffer, 1337, 9)).to.throw();
		});
	});
	describe("Buffer#writeUInt32LE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeUInt32LE(1337)).to.equal(nodeBuffer.writeUInt32LE(1337));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeUInt32LE(1337, 2)).to.equal(nodeBuffer.writeUInt32LE(1337, 2));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeUInt32LE.bind(browserBuffer, 1337, 9)).to.throw();
		});
	});
	describe("Buffer#writeUIntBE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeUIntBE(1337, 0, 5)).to.equal(nodeBuffer.writeUIntBE(1337, 0, 5));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeUIntBE(1337, 2, 5)).to.equal(nodeBuffer.writeUIntBE(1337, 2, 5));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeUIntBE.bind(browserBuffer, 1337, 9, 5)).to.throw();
		});
		it("throws an error if offset is unspecified", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeUIntBE.bind(browserBuffer, 1337, undefined, 5)).to.throw();
		});
		it("throws an error if byteLength is unspecified", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeUIntBE.bind(browserBuffer, 1337, 0)).to.throw();
		});
	});
	describe("Buffer#writeUIntLE", function(){
		it("matches the NodeJS implementation", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			const nodeBuffer = Buffer.alloc(10, 0xff);
			expect(browserBuffer.writeUIntLE(1337, 0, 5)).to.equal(nodeBuffer.writeUIntLE(1337, 0, 5));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
			expect(browserBuffer.writeUIntLE(1337, 2, 5)).to.equal(nodeBuffer.writeUIntLE(1337, 2, 5));
			expect(browserBuffer).to.deep.equal(nodeBuffer);
		});
		it("throws an error if writing out of bounds", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeUIntLE.bind(browserBuffer, 1337, 9, 5)).to.throw();
		});
		it("throws an error if offset is unspecified", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeUIntLE.bind(browserBuffer, 1337, undefined, 5)).to.throw();
		});
		it("throws an error if byteLength is unspecified", function(){
			const browserBuffer = BrowserBuffer.alloc(10, 0xff);
			expect(browserBuffer.writeUIntLE.bind(browserBuffer, 1337, 0)).to.throw();
		});
	});
	describe("Buffer.copyBytesFrom", function(){
		it("works", function(){
			const u8 = new Uint8Array([0, 0x11, 0x22]);
			let buf = BrowserBuffer.copyBytesFrom(u8, 1, 1);
			expect(buf).to.deep.equal(BrowserBuffer.from([0x11]));
			u8[1] = 0;
			expect(buf).to.deep.equal(BrowserBuffer.from([0x11]));

			const u16 = new Uint16Array([0, 0xaaff, 0x1337]);
			buf = BrowserBuffer.copyBytesFrom(u16, 1, 1);
			expect(buf).to.deep.equal(BrowserBuffer.from([0xff, 0xaa]));
			u16[1] = 0;
			expect(buf).to.deep.equal(BrowserBuffer.from([0xff, 0xaa]));

			const u32 = new Uint32Array([0, 0xaaff, 0x1337]);
			buf = BrowserBuffer.copyBytesFrom(u32, 1, 1);
			expect(buf).to.deep.equal(BrowserBuffer.from([0xff, 0xaa, 0x00, 0x00]));
			u16[1] = 0;
			expect(buf).to.deep.equal(BrowserBuffer.from([0xff, 0xaa, 0x00, 0x00]));

			const f64 = new Float64Array([0, 0xaaff, 0x1337]);
			buf = BrowserBuffer.copyBytesFrom(f64, 1, 1);
			expect(buf).to.deep.equal(BrowserBuffer.from([0, 0, 0, 0, 224, 95, 229, 64]));
			u16[1] = 0;
			expect(buf).to.deep.equal(BrowserBuffer.from([0, 0, 0, 0, 224, 95, 229, 64]));

			const u8Too = new Uint8Array([0, 0x11, 0x22]);
			buf = BrowserBuffer.copyBytesFrom(u8Too);
			expect(buf).to.deep.equal(BrowserBuffer.from([0, 0x11, 0x22]));
			u8[1] = 0;
			expect(buf).to.deep.equal(BrowserBuffer.from([0, 0x11, 0x22]));
		});
	});
	describe("Deprecated SlowBuffer constructor", function(){
		it("works", function(){
			// @ts-ignore
			const buf = new BrowserSlowBuffer(2);
			expect(buf).to.be.instanceOf(BrowserBuffer);
			expect(buf.length).to.eq(2);
		});
	});
});
