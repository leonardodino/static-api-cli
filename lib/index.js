const rmfr = require('rmfr')
const vfile = require('vfile')
const {default: Path} = require('path-parser')
const {pipe, save} = require('./utils')

// transform path format and data to absolute path
const abs = (root, prefix) => pipe(
	data => prefix.build(data),
	url => root + url,
	string => string.toLowerCase(),
)

// make vfile path absolute
const absFile = (dest, prefix) => file => {
	if(!prefix) return file
	file.path = abs(dest, prefix)(file.data)
	return vfile(file)
}

module.exports = class API {
	constructor({source, parser, record, prefix}){
		this.source = source
		this.prefix = new Path(prefix)
		this.record = new Path(record)
		this.parser = parser
		this._leafs = []

		// [TODO]: add babel, use class properties
		this.collect = dest => async output => {
			const file = absFile(dest, this.prefix)(output)
			this._leafs.push(file.data)
			return file
		}

		this.index = async dest => await pipe(
			leafs => leafs.map(data => ({data, path: abs(dest, this.record)(data)})),
			records => records.reduce((records, {path, data}) => {
				records[path] = (records[path] || [])
				records[path].push(data)
				return records
			}, {}),
			records => Object.entries(records),
			records => records.map(([path, data]) => (
				vfile({path, contents: JSON.stringify(data)})
			)),
		)(this._leafs)
	}

	async transform(dest, writer){
		const {source, parser, collect, index} = this
		this._leafs = []
		await source.transform(parser, pipe.async(collect(dest), writer))
		await index(dest).then(files => files.map(writer))
	}

	async compile(dest){
		await rmfr(dest)
		await this.transform(dest, save)
	}
}
