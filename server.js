const express = require('express')
const app = express()

app.use(express.static('public'))

app.listen(process.env.PORT || 8080, ()=> console.log('Server Up'))

'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');