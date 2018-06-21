const pify = require('pify')
const mkdirp = require('mkdirp')
const {write} = require('to-vfile')
const mkdirPromise = pify(mkdirp)

const pipe = (...fns) => fns.reduce((f, g) => (...args) => g(f(...args)))
pipe.sync = pipe
pipe.async = (...fns) => fns.reduce(
	(f, g) => async (...args) => await g( await f(...args))
)

const omit = keys => obj => Object.entries(obj)
	.filter(([key]) => !keys.includes(key))
	.reduce((obj, [key, value]) => Object.assign(obj, {[key]: value}), {})

const save = async (file /* vfile */) => {
	if(!file.contents) return
	await mkdirPromise(file.dirname)
	await write(file)
}

module.exports = {pipe, save, omit}
