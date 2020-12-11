const accumulateResponse = require('../accumulate-response/index');
const assert = require('assert');

describe('accumulate response plugin', () => {
  var plugin = null;

  beforeEach(() => {
    var config = {};
    var logger = {};
    var stats = {};

    plugin = accumulateResponse.init.apply(null, [config, logger, stats]);
  });

  it('exposes an ondata_response handler', (done) => {
    assert.ok(plugin.ondata_response);
    done()
  });

  it('exposes an onend_response handler', (done) => {
    assert.ok(plugin.onend_response);
    done()
  });

  it('calls back with two null function arguments in the ondata_response handler', (done) => {
    var cb = (err, result) => {
      assert.equal(err, null);
      assert.equal(result, null);
      done();
    }


    plugin.ondata_response.apply(null, [{}, {}, Buffer.alloc(5, 'a'), cb]);
  });

  it('will collect all buffers provided to ondata_response handler, concatenate them, and return them as a single buffer', (done) => {
    var desiredResult = 'aaaaaaaaaaaaaaa';
    
    var ondata_cb = (err, result) => {
      assert.equal(err, null);
      assert.equal(result, null);
      assert.ok(res._chunks);
    }

    var onend_cb = (err, result) => {
      assert.equal(err, null);
      assert.equal(result.toString(), desiredResult); 
      done();
    } 

    var res = {};

    plugin.ondata_response.apply(null, [{}, res, Buffer.alloc(5, 'a'), ondata_cb]);
    plugin.ondata_response.apply(null, [{}, res, Buffer.alloc(5, 'a'), ondata_cb]);
    plugin.ondata_response.apply(null, [{}, res, Buffer.alloc(5, 'a'), ondata_cb]);
    
    plugin.onend_response.apply(null, [{}, res, null, onend_cb]);  
  });

  it('will append data included in the end call to the buffer', (done) => {
    var desiredResult = 'aaaaaaaaaaaaaaaaaaaa';
    
    var ondata_cb = (err, result) => {
      assert.equal(err, null);
      assert.equal(result, null);
      assert.ok(res._chunks);
    }

    var onend_cb = (err, result) => {
      assert.equal(err, null);
      assert.equal(result.toString(), desiredResult); 
      done();
    } 

    var res = {};

    plugin.ondata_response.apply(null, [{}, res, Buffer.alloc(5, 'a'), ondata_cb]);
    plugin.ondata_response.apply(null, [{}, res, Buffer.alloc(5, 'a'), ondata_cb]);
    plugin.ondata_response.apply(null, [{}, res, Buffer.alloc(5, 'a'), ondata_cb]);
    
    plugin.onend_response.apply(null, [{}, res, Buffer.alloc(5, 'a'), onend_cb]);  
  });

  it('will create a res._chunks object on the request object', (done) => {
    var res = {};
    var cb = (err, result) => {
      assert.equal(err, null);
      assert.equal(result, null);
      assert.ok(res._chunks);
      assert.equal(res._chunks.toString(), 'aaaaa');
      done();
    }

    plugin.ondata_response.apply(null, [{}, res, Buffer.alloc(5, 'a'), cb]);
  });

  it('will callback with null if no response body is present in targetResponse', (done) => {
    var res = {};
    var cb = (err, result) => {
      assert.equal(err, null);
      assert.equal(result, null);
      done();
    }

    plugin.onend_response.apply(null, [{}, res, null, cb]);

  });


  it('Will process string data in ondata_response handler ', (done) => {
    const desiredResult = 'aaa';
    
    const ondata_cb = (err, result) => {
      assert.equal(err, null);
      assert.equal(result, null);
      assert.ok(res._chunks);
    }

    const onend_cb = (err, result) => {
      assert.equal(err, null);
      assert.equal(result.toString(), desiredResult); 
      done();
    } 

    const res = {};

    plugin.ondata_response.apply(null, [{}, res,'a', ondata_cb]);
    plugin.ondata_response.apply(null, [{}, res,'a', ondata_cb]);
    plugin.ondata_response.apply(null, [{}, res,'a', ondata_cb]);
    
    plugin.onend_response.apply(null, [{}, res, null, onend_cb]);  
  });

  it('Will process numeric data in ondata_response handler ', (done) => {
    const desiredResult = '123';
    const res = {};

    const ondata_cb = (err, result) => {
      assert.equal(err, null);
      assert.equal(result, null);
      assert.ok(res._chunks);
    }

    const onend_cb = (err, result) => {
      assert.equal(err, null);
      assert.equal(result.toString(), desiredResult); 
      done();
    } 

    plugin.ondata_response.apply(null, [{}, res, 1, ondata_cb]);
    plugin.ondata_response.apply(null, [{}, res, 2, ondata_cb]);
    plugin.ondata_response.apply(null, [{}, res, 3, ondata_cb]);
    
    plugin.onend_response.apply(null, [{}, res, null, onend_cb]);  
  });

  it('Will process boolean data in ondata_response handler ', (done) => {
    const desiredResult = 'truefalsetrue';
    const res = {};

    const ondata_cb = (err, result) => {
      assert.equal(err, null);
      assert.equal(result, null);
      assert.ok(res._chunks);
    }

    const onend_cb = (err, result) => {
      assert.equal(err, null);
      assert.equal(result.toString(), desiredResult); 
      done();
    } 

    plugin.ondata_response.apply(null, [{}, res, true, ondata_cb]);
    plugin.ondata_response.apply(null, [{}, res, false, ondata_cb]);
    plugin.ondata_response.apply(null, [{}, res, true, ondata_cb]);
    
    plugin.onend_response.apply(null, [{}, res, null, onend_cb]);  
  });

})
