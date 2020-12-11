const debug = require('debug')('plugin:helperFunctions');

/**
 * If data is already an instance of buffer then return same and otherwise convert the data to buffer.
 * @param {*} data can be of type any.
 */
module.exports.toBuffer = function(data){
    if ( Buffer.isBuffer(data) ){
      return data;
    }
    if ( typeof data === 'object') {
        data = JSON.stringify(data);
    }
    if ( typeof data === 'number' || typeof data === 'boolean') {
        data += '';
    }
    if ( typeof data === 'string') {
        try {
          data = Buffer.from(data, 'utf-8');
        } catch(err) {
          debug('Error in converting to buffer')
        }
    }
    return data;
}