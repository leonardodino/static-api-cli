const {join} = require('path')
const rmfr = require('rmfr')
const vfile = require('vfile')
const {default: Path} = require('path-parser')
const {pipe, save, omit} = require('./utils')

// make vfile path absolute
const abs = (dest, prefix) => _file => {
	const file = vfile(_file)
	if(!prefix) return file
	file.path = dest + prefix.build(file.data)
	return file
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
			const file = abs(dest, this.prefix)(output)
			this._leafs.push(file.data)
			return file
		}

		this.index = async dest => {
			const {record, _leafs} = this

			return await pipe(
				leafs => leafs.map(leaf => ({
					path: join(dest, record.build(leaf)),
					data: omit(record.urlParams)(leaf),
				})),
				records => records.reduce((records, {path, data}) => {
					records[path] = (records[path] || [])
					records[path].push(data)
					return records
				}, {}),
				records => Object.entries(records),
				records => records.map(([path, data]) => (
					vfile({path, contents: JSON.stringify(data)})
				)),
			)(_leafs)
		}
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

