module.exports = {
	Buffer,
	// eslint-disable-next-line object-shorthand
	SlowBuffer: function(len){
		return Buffer.allocUnsafeSlow(len);
	},
	INSPECT_MAX_BYTES: 0,
	kMaxLength: 0x7fffffff
};
