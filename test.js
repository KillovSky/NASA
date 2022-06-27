const NASA = require('./index')

NASA.APOD().then(data => console.log(data))