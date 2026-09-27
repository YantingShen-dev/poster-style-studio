#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
const C=require('../assets/editor/core.js');
try{if(process.argv.length!==3)throw Error('Usage: node validate_project.cjs /path/to/file.posterproj');const file=path.resolve(process.argv[2]);const data=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));const p=C.validateProject(data);const reloaded=C.validateProject(JSON.parse(JSON.stringify(p)));if(JSON.stringify(p)!==JSON.stringify(reloaded))throw Error('Serialization changed project data');console.log(JSON.stringify({valid:true,name:p.name,objects:p.objects.length,assets:Object.keys(p.assets).length,fonts:p.fonts.length}));}catch(err){console.error(err.message);process.exitCode=1;}
