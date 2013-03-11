var util = require('util');
var flow = require('../lib/fnFlow').flow;
var us = require('underscore');

module.exports.setUp = function(cb){
  cb();
}
module.exports.tearDown = function(cb){
  cb();
}

var bindFunctions = function(C){
  for(var name in C){
    var fn = C[name];
    if(typeof fn == 'function') C[name] = fn.bind(C);
  }
}

BaseClass = function BaseClass(){};
BaseClass.getByAttribute = function(attribute, value, cb){
  var self = this;
  var o = self.all[us.find(Object.keys(self.all), function(id){ return self.all[id][attribute] == value; })];
  return cb(null, o);
}
BaseClass.findByAttribute = function(attribute, value, cb){
  var self = this;
  value = value && value.id || value;
  var results = us.map(us.filter(Object.keys(self.all), function(id){ return self.all[id][attribute] == value; }), function(o){ return self.all[o]; });
  return cb(null, results);
}
BaseClass.getById = function(id, cb){
  console.log('getById', arguments)
  id = id && id.id || id;
  return cb(null, this.all[id]);
}
BaseClass.assertExistence = function(object, cb){
  if(!object) return cb(new Error(this.name + " did not exist"));
  return cb(null, true);
};

Genre = us.extend(function Genre(){}, BaseClass);
util.inherits(Genre, BaseClass);
Genre.getByName = function(name, cb){ return this.getByAttribute('name', name, cb); };
Genre.prototype.findBooksByAuthor = function(author, cb) { return Book.findByGenreAndAuthor(this, author, cb); }
bindFunctions(Genre);

Author = us.extend(function Author(){}, BaseClass);
util.inherits(Author, BaseClass);
Author.getByName = function(name, cb){ return this.getByAttribute('name', name, cb); };
bindFunctions(Author);

BookSeries = us.extend(function BookSeries(){}, BaseClass);
util.inherits(BookSeries, BaseClass);
BookSeries.getByName = function(name, cb){ return this.getByAttribute('name', name, cb); };
BookSeries.findByAuthorId = function(authorId, cb){ return BookSeries.findByAttribute('authorId', authorId, cb); };
bindFunctions(BookSeries);

Book = us.extend(function Book(){}, BaseClass);
util.inherits(Book, BaseClass);
Book.getByTitle = function(title, cb){ return Book.getByAttribute('title', title, cb); };
Book.findBySeriesId = function(seriesId, cb){ return Book.findByAttribute('bookSeriesId', seriesId, cb); };
Book.findByAuthorId = function(authorId, cb){ return Book.findByAttribute('authorId', authorId, cb); };
Book.findByGenreId = function(genreId, cb){ return Book.findByAttribute('genreId', genreId, cb); };
Book.findByGenreAndAuthor = function(genreId, authorId, cb){ 
  genreId = genreId && genreId.id || genreId; 
  authorId = authorId && authorId.id || authorId; 
  if(genreId == 5) return cb(new Error("this was a test"));
  cb(null, us.where(Book.all, {genreId: genreId, authorId: authorId})); 
};
bindFunctions(Book);

Genre.all = {
  1: us.extend(new Genre(), {id: 1, name: "Fantasy"}),
  2: us.extend(new Genre(), {id: 2, name: "Romance"}),
  3: us.extend(new Genre(), {id: 3, name: "Fiction"}),
  4: us.extend(new Genre(), {id: 4, name: "Sports"}),
  5: us.extend(new Genre(), {id: 5, name: "???"})
}

Author.all = {
  1: us.extend(new Author(), {id: 1, name: "Patricia Briggs"}),
  2: us.extend(new Author(), {id: 2, name: "Clive Cussler"}),
  3: us.extend(new Author(), {id: 3, name: "Tom Coughlin"}),
  4: us.extend(new Author(), {id: 4, name: "Dan Brown"}),
  5: us.extend(new Author(), {id: 5, name: "Robert Jordan"}),
  6: us.extend(new Author(), {id: 6, name: "Barbara Hambly"})
}

BookSeries.all = {
  1: us.extend(new BookSeries(), {id: 1, name: "Mercy Thompson", authorId: 1}),
  2: us.extend(new BookSeries(), {id: 2, name: "The Wheel of Time", authorId: 5}),
  3: us.extend(new BookSeries(), {id: 3, name: "Sun-Cross", authorId: 6})
}

Book.all = {
  1: us.extend(new Book(), {id: 1, title: "Frost Burned", authorId: 1, bookSeriesId: 1, genreId: 2}),
  2: us.extend(new Book(), {id: 2, title: "Moon Called", authorId: 1, bookSeriesId: 1, genreId: 2}),
  3: us.extend(new Book(), {id: 3, title: "River Marked", authorId: 1, bookSeriesId: 1, genreId: 2}),
  4: us.extend(new Book(), {id: 4, title: "The Striker", authorId: 2, genreId: 3}),
  5: us.extend(new Book(), {id: 5, title: "Earn the Right to Win", authorId: 3, genreId: 4}),
  6: us.extend(new Book(), {id: 6, title: "Inferno", authorId: 4, genreId: 3}),
  7: us.extend(new Book(), {id: 7, title: "The Rainbow Abyss", authorId: 6, bookSeriesId: 3, genreId: 1}),
  8: us.extend(new Book(), {id: 8, title: "The Magicians of Night", authorId: 6, bookSeriesId: 3, genreId: 1}),
  9: us.extend(new Book(), {id: 9, title: "The Eye of the World", authorId: 5, bookSeriesId: 2, genreId: 1}),
  10: us.extend(new Book(), {id: 10, title: "The Gathering Storm", authorId: 5, bookSeriesId: 2, genreId: 1}),
  11: us.extend(new Book(), {id: 11, title: "The Towers of Midnight", authorId: 5, bookSeriesId: 2, genreId: 1})
}


module.exports["flow data"] = function(test){
  flow({
    bookId: 1
  }, {
    getBook: [Book.getById, 'bookId']
  }, function(err, results){
    test.equals(results.getBook, Book.all[1]);
    test.done();
  });
}

module.exports["flow functions and data"] = function(test){
  flow({
    authorId: 5
  }, {
    getAuthor: [Author.getById, 'authorId'],
    getBooks: [Book.findByAuthorId, 'getAuthor']
  }, function(err, results){
    test.ok(!err);
    test.deepEqual(results, {
      authorId: 5,
      getAuthor: Author.all[5],
      getBooks: [Book.all[9], Book.all[10], Book.all[11]]
    });
    test.done();
  });
}

module.exports["parallel flow functions and data"] = function(test){
  flow({
    authorName: 'Dan Brown',
    genreName: 'Fiction'
  }, {
    getAuthor: [Author.getByName, 'authorName'],
    getGenre: [Genre.getByName, 'genreName'],
    getBooks: [Book.findByGenreAndAuthor, 'getGenre', 'getAuthor']
  }, function(err, results){
    test.ok(!err);
    test.deepEqual(results, {
      authorName: 'Dan Brown',
      genreName: 'Fiction',
      getAuthor: Author.all[4],
      getGenre: Genre.all[3],
      getBooks: [Book.all[6]]
    });
    test.done();
  });
}

module.exports["flow task error"] = function(test){
  flow({
    authorName: 'Dan Brown',
    genreName: '???'
  }, {
    getAuthor: [Author.getByName, 'authorName'],
    getGenre: [Genre.getByName, 'genreName'],
    getBooks: [Book.findByGenreAndAuthor, 'getGenre', 'getAuthor']
  }, function(err, results){
    test.ok(err);
    test.equals(err.message, "this was a test");
    test.done();
  });
}

module.exports["instance task execution"] = function(test){
  flow({
    authorName: 'Dan Brown',
    genreName: 'Fiction'
  }, {
    getAuthor: [Author.getByName, 'authorName'],
    getGenre: [Genre.getByName, 'genreName'],
    getBooks: ['getGenre', 'findBooksByAuthor', 'getAuthor']
  }, function(err, results){
    test.ok(!err);
    test.deepEqual(results, {
      authorName: 'Dan Brown',
      genreName: 'Fiction',
      getAuthor: Author.all[4],
      getGenre: Genre.all[3],
      getBooks: [Book.all[6]]
    });
    test.done();
  });  
}

module.exports["prerequisite task execution"] = function(test){
  flow({
    authorName: 'Dan Brown',
    genreName: 'Fiction'
  }, {
    getAuthor: [Author.getByName, 'authorName'],
    getGenre: [Genre.getByName, 'genreName'],
    assertGenreExistence: [Genre.assertExistence, 'getGenre'],
    getBooks: ['assertGenreExistence', Book.findByGenreAndAuthor, 'getGenre', 'getAuthor']
  }, function(err, results){
    test.ok(!err);
    test.deepEqual(results, {
      authorName: 'Dan Brown',
      genreName: 'Fiction',
      getAuthor: Author.all[4],
      getGenre: Genre.all[3],
      assertGenreExistence: true,
      getBooks: [Book.all[6]]
    });
    test.done();
  });
}

module.exports["prerequisite task execution with short circuit error"] = function(test){
  flow({
    authorName: 'Dan Brown',
    genreName: 'Yourmom'
  }, {
    getAuthor: [Author.getByName, 'authorName'],
    getGenre: [Genre.getByName, 'genreName'],
    assertGenreExistence: [Genre.assertExistence, 'getGenre'],
    getBooks: ['assertGenreExistence', Book.findByGenreAndAuthor, 'getGenre', 'getAuthor']
  }, function(err, results){
    test.ok(err);
    test.equals(err.message, "Genre did not exist");
    test.deepEqual(results, {
      authorName: 'Dan Brown',
      genreName: 'Yourmom',
      getAuthor: Author.all[4],
      getGenre: undefined,
      assertGenreExistence: undefined
    });
    test.done();
  });
}


module.exports["prerequisite instance task execution"] = function(test){
  flow({
    authorName: 'Dan Brown',
    genreName: 'Fiction'
  }, {
    getAuthor: [Author.getByName, 'authorName'],
    getGenre: [Genre.getByName, 'genreName'],
    assertGenreExistence: [Genre.assertExistence, 'getGenre'],
    getBooks: ['assertGenreExistence', 'getGenre', 'findBooksByAuthor', 'getAuthor']
  }, function(err, results){
    test.ok(!err);
    test.deepEqual(results, {
      authorName: 'Dan Brown',
      genreName: 'Fiction',
      getAuthor: Author.all[4],
      getGenre: Genre.all[3],
      assertGenreExistence: true,
      getBooks: [Book.all[6]]
    });
    test.done();
  });  
}


module.exports["prerequisite instance task execution with short circuit error"] = function(test){
  flow({
    authorName: 'Dan Brown',
    genreName: 'Yourmom'
  }, {
    getAuthor: [Author.getByName, 'authorName'],
    getGenre: [Genre.getByName, 'genreName'],
    assertGenreExistence: [Genre.assertExistence, 'getGenre'],
    getBooks: ['assertGenreExistence', 'getGenre', 'findBooksByAuthor', 'getAuthor']
  }, function(err, results){
    test.ok(err);
    test.equals(err.message, "Genre did not exist");
    test.deepEqual(results, {
      authorName: 'Dan Brown',
      genreName: 'Yourmom',
      getAuthor: Author.all[4],
      getGenre: undefined,
      assertGenreExistence: undefined
    });
    test.done();
  });
}


