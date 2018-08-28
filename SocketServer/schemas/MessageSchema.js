const mongoose = require('mongoose');

const paginationCount = require('../utils/config').pagination_count;

let Schema = {};

Schema.createSchema = (mongoose) => {
  const messageSchema = mongoose.Schema({
    idx: { type: Number, required: true, index: { unique: true } },
    user: {
      idx: { type: Number, required: true },
      nickname: { type: String, required: true },
      avatar: String},
    position: {
      type: { type: String, default: "Point"},
      coordinates: [{ type: Number }]
    },
    contents: { type: String, required: true },
    type: { type: String, default: "Message" },
    like_count: { type: Number, default: 0, index: true },
    likes: [ Number ],
    created_at : { type : Date, index: { unique : false }, default: Date.now }
  });

  messageSchema.index({ location: '2dsphere'});

  
  /*******************
   * 메소드 시작
  ********************/

  // count : idx의 최대값 구하기
  messageSchema.static('count', async function(callback) {
    return await this.find({}, { idx: 1 }, callback)
      .sort({ "idx": -1 }).limit(1);
  });

  // selectOne : 하나 조회하기
  messageSchema.static('selectOne', function(idx, callback) {
    return this.find({ idx: parseInt(idx) }, callback);
  });

  // selectAll : 전체 조회하기
  messageSchema.static('selectAll', function(blocks, page, callback) {
    if (!page) { // 페이지 인자가 없음 : 페이지네이션이 되지 않은 경우
      return this.find({ 'user.idx': { $nin: blocks }}, callback)
        .sort('created_at');
    } else {     // 페이지 인자가 있음 : 페이지네이션 적용
      return this.find({ 'user.idx': { $nin: blocks }}, callback)
        .sort('created_at')
        .skip((page-1) * paginationCount).limit(paginationCount);
    }
  });

  // selectCircle : 특정 반경 내의 값 조회하기
  messageSchema.static('selectCircle', function(conditions, blocks, page, callback) {
    /* where 안에 들어가는 이름은 해당 컬럼의 이름임에 주의한다! */
    if (!page) { // 페이지 인자가 없음 : 페이지네이션이 되지 않은 경우
      return this.find({ 'user.idx': { $nin: blocks }}, callback)
        .where('position')
        .within(
          {
            center : [parseFloat(conditions.lng), parseFloat(conditions.lat)],
            radius : parseFloat(conditions.radius/6371000), // change radian: 1/6371 -> 1km
            unique : true, spherical : true
          }
        ).sort('-created_at');
    } else {     // 페이지 인자가 있음 : 페이지네이션 적용
      return this.find({ 'user.idx': { $nin: blocks }}, callback)
        .where('position')
        .within(
          {
            center : [parseFloat(conditions.lng), parseFloat(conditions.lat)],
            radius : parseFloat(conditions.radius/6371000), // change radian: 1/6371 -> 1km
            unique : true, spherical : true
          }
        )
        .sort('-created_at')
        .skip((page-1) * paginationCount).limit(paginationCount);
    }
  });

  // like : 좋아요 누르기, 취소하기
  messageSchema.static('like', function(userIdx, messageIdx, callback) {
    this.findOneAndUpdate(
      { idx: parseInt(messageIdx) },
      { $push: { likes: userIdx },
        $inc: { like_count: 1} },
      callback
    );
  });

  // like : 좋아요 누르기, 취소하기
  messageSchema.static('dislike', function(userIdx, messageIdx, callback) {
    this.findOneAndUpdate(
      { idx: parseInt(messageIdx) },
      { $pop: { likes: userIdx },
        $inc: { like_count: -1} },
      callback
    );
  });

  return messageSchema;
};

module.exports = Schema;