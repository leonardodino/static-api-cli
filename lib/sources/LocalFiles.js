const {forEach, forEachSeries} = require('p-iteration')
const {read} = require('to-vfile')
const vfile = require('vfile')
const {resolve, relative} = require('path')
const findDown = require('vfile-find-down')
const pify = require('pify')
const findFiles = pify(findDown.all)
const {pipe} = require('../utils')

const toArray = x => (Array.isArray(x) ? x : [x]).filter(a => a)

class LocalFiles {
	constructor(path, tests){
		if(!path) throw Error('LocalFiles: missing path')
		if(!tests) throw Error('LocalFiles: missing tests')
		this.root = resolve(path)
		this.tests = tests
	}
	async transform(parser, writer){
		const {root, tests} = this
		const files = await findFiles(tests, root)
		await forEachSeries(files, async file => {
			const input = await read(file)
			input.path = relative(root, input.path)
			const result = await parser(input)
			await forEach(toArray(result), pipe.async(vfile, writer))
		})
	}
}

module.exports = LocalFiles
