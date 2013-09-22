var us = require('underscore');
var test_data = require('../support/test-data');
var Flow = require('../lib/fnFlow').Flow;

Book = test_data.Book;
Author = test_data.Author;
Genre = test_data.Genre;
BookSeries = test_data.BookSeries;

module.exports.setUp = function(cb){
  cb();
}
module.exports.tearDown = function(cb){
  cb();
}

module.exports["flow data"] = function(test){
  var flow = new Flow({
    bookId: 1
  });
  flow.tasks.getBook = new Flow.Task(Book.getById, 'bookId');
  flow.execute(function(err, results){
    test.equals(results.getBook, Book.all[1]);
    test.done();
  });
}

module.exports["flow functions and data"] = function(test){
  var flow = new Flow({
    authorId: 5
  });
  flow.tasks.getAuthor = new Flow.Task(Author.getById, 'authorId');
  flow.tasks.getBooks = new Flow.Task(Book.findByAuthorId, 'getAuthor');
  flow.execute(function(err, results){
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
  var flow = new Flow({
    authorName: 'Dan Brown',
    genreName: 'Fiction'
  });
  flow.tasks.getAuthor = new Flow.Task(Author.getByName, 'authorName');
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.getBooks = new Flow.Task(Book.findByGenreAndAuthor, 'getGenre', 'getAuthor');
  flow.execute(function(err, results){
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

module.exports["function as task"] = function(test){
  var flow = new Flow({});
  flow.tasks.getAuthors = new Flow.Task(Author.getAll);
  flow.execute(function(err, results){
    test.ok(!err, "no error");
    test.deepEqual(results, {
      getAuthors: Author.all
    }, 'results match');
    test.done();
  });
}

module.exports["flow task callback with error"] = function(test){
  var flow = new Flow({
    authorName: 'Dan Brown',
    genreName: '???'
  });
  flow.tasks.getAuthor = new Flow.Task(Author.getByName, 'authorName');
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.getBooks = new Flow.Task(Book.findByGenreAndAuthor, 'getGenre', 'getAuthor');
  flow.execute(function(err, results){
    test.ok(err);
    test.equals(err.message, "this was a test");
    test.done();
  });
}

module.exports["instance task execution"] = function(test){
  var flow = new Flow({
    authorName: 'Dan Brown',
    genreName: 'Fiction'
  });
  flow.tasks.getAuthor = new Flow.Task(Author.getByName, 'authorName');
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.getBooks = new Flow.Task('getGenre.findBooksByAuthor', 'getAuthor');
  flow.execute(function(err, results){
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
  var flow = new Flow({
    authorName: 'Dan Brown',
    genreName: 'Fiction'
  });
  flow.tasks.getAuthor = new Flow.Task(Author.getByName, 'authorName');
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.assertGenreExistence = new Flow.Task(Genre.assertExistence, 'getGenre');
  flow.tasks.getBooks = new Flow.Task(Book.findByGenreAndAuthor, 'getGenre', 'getAuthor').requires('assertGenreExistence');
  flow.execute(function(err, results){
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
  var flow = new Flow({
    authorName: 'Dan Brown',
    genreName: 'Yourmom'
  })
  flow.tasks.getAuthor = new Flow.Task(Author.getByName, 'authorName');
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.assertGenreExistence = new Flow.Task(Genre.assertExistence, 'getGenre');
  flow.tasks.getBooks = new Flow.Task(Book.findByGenreAndAuthor, 'getGenre', 'getAuthor').requires('assertGenreExistence');
  flow.execute(function(err, results){
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
  var flow = new Flow({
    authorName: 'Dan Brown',
    genreName: 'Fiction'
  });
  flow.tasks.getAuthor = new Flow.Task(Author.getByName, 'authorName');
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.assertGenreExistence = new Flow.Task(Genre.assertExistence, 'getGenre');
  flow.tasks.getBooks = new Flow.Task('getGenre.findBooksByAuthor', 'getAuthor').requires('assertGenreExistence');
  flow.execute(function(err, results){
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
  var flow = new Flow({
    authorName: 'Dan Brown',
    genreName: 'Yourmom'
  });
  flow.tasks.getAuthor = new Flow.Task(Author.getByName, 'authorName');
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.assertGenreExistence = new Flow.Task(Genre.assertExistence, 'getGenre');
  flow.tasks.getBooks = new Flow.Task('getGenre.findBooksByAuthor', 'getAuthor').requires('assertGenreExistence');
  flow.execute(function(err, results){
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

module.exports["multiple instance parameter"] = function(test){
  var flow = new Flow({
    page: {
      number: 1,
      chapter: {
        number: 2,
        book: Book.all[5]
      }
    }
  });
  flow.tasks.getGenre = new Flow.Task(Genre.getById, 'page.chapter.book.genreId');
  flow.execute(function(err, results){
    test.deepEqual(results.getGenre, Genre.all[4]);
    test.done();
  });
}

module.exports["result multi instance function"] = function(test){
  var flow = new Flow({
    page: {
      number: 1,
      chapter: {
        number: 2,
        book: Book.all[5]
      }
    }
  });
  flow.tasks.getAuthor = new Flow.Task('page.chapter.book.getAuthor');
  flow.execute(function(err, results){
    test.deepEqual(results.getAuthor, Author.all[3]);
    test.done();
  });
}

module.exports["instance task execution with result instance parameter"] = function(test){
  var flow = new Flow({
    authorName: 'Dan Brown',
    genreName: 'Fiction'
  });
  flow.tasks.getAuthor = new Flow.Task(Author.getByName, 'authorName');
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.getBooks = new Flow.Task('getGenre.findBooksByAuthor', 'getAuthor.id');
  flow.execute(function(err, results){
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

module.exports["multiple asyncronus tasks with prerequisite task execution"] = function(test){
  var flow = new Flow( [
    { authorName: 'Dan Brown',
      genreName: 'Fiction'
    },
    { authorName: 'Patricia Briggs',
      genreName: 'Fantasy'
    }
  ]);
  flow.tasks.getAuthor = new Flow.Task(Author.getByName, 'authorName');
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.assertGenreExistence = new Flow.Task(Genre.assertExistence, 'getGenre');
  flow.tasks.getBooks = new Flow.Task(Book.findByGenreAndAuthor, 'getGenre', 'getAuthor').requires('assertGenreExistence');
  flow.execute(function(err, results){
    test.ok(!err);
    test.deepEqual(results, [
      { authorName: 'Dan Brown',
        genreName: 'Fiction',
        getAuthor: { id: 4, name: 'Dan Brown' },
        getGenre: { id: 3, name: 'Fiction' },
        assertGenreExistence: true,
        getBooks: [ { id: 6, title: 'Inferno', authorId: 4, genreId: 3 } ] },
      { authorName: 'Patricia Briggs',
        genreName: 'Fantasy',
        getAuthor: { id: 1, name: 'Patricia Briggs' },
        getGenre: Genre.all[1],
        assertGenreExistence: true,
        getBooks: [] }]
    );
    test.done();
  });
}

module.exports["multiple asyncronus tasks with prerequisite task execution (error)"] = function(test){
  var flow = new Flow([
      { authorName: 'Dan Brown',
        genreName: 'Fiction'
      },
      { authorName: 'Patricia Briggs',
        genreName: 'Robot Romance Novels'
      }
  ]);
  flow.tasks.getAuthor = new Flow.Task(Author.getByName, 'authorName');
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.assertGenreExistence = new Flow.Task(Genre.assertExistence, 'getGenre');
  flow.tasks.getBooks = new Flow.Task(Book.findByGenreAndAuthor, 'getGenre', 'getAuthor').requires('assertGenreExistence');
  flow.execute(function(err, results){
    test.ok(err);
    test.equal(results[0], undefined);
    test.deepEqual(results[1], { 
      authorName: 'Patricia Briggs',
      genreName: 'Robot Romance Novels',
      getAuthor: { id: 1, name: 'Patricia Briggs' },
      getGenre: undefined,
      assertGenreExistence: undefined
    });
    test.done();
  });
}

module.exports["multiple asyncronus tasks with prerequisite instance task execution"] = function(test){
  var flow = new Flow([
    { authorName: 'Dan Brown',
      genreName: 'Fiction'
    },
    { authorName: 'Patricia Briggs',
      genreName: 'Fantasy'
    }
  ]);
  flow.tasks.getAuthor = new Flow.Task(Author.getByName, 'authorName');
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.assertGenreExistence = new Flow.Task(Genre.assertExistence, 'getGenre');
  flow.tasks.getBooks = new Flow.Task('getGenre.findBooksByAuthor', 'getAuthor').requires('assertGenreExistence');
  flow.execute(function(err, results){
    test.ok(!err);
    test.deepEqual(results, [
      { authorName: 'Dan Brown',
        genreName: 'Fiction',
        getAuthor: { id: 4, name: 'Dan Brown' },
        getGenre: { id: 3, name: 'Fiction' },
        assertGenreExistence: true,
        getBooks: [ { id: 6, title: 'Inferno', authorId: 4, genreId: 3 } ] },
      { authorName: 'Patricia Briggs',
        genreName: 'Fantasy',
        getAuthor: { id: 1, name: 'Patricia Briggs' },
        getGenre: Genre.all[1],
        assertGenreExistence: true,
        getBooks: [] } 
    ]);
    test.done();
  });  
}

module.exports["multiple asyncronus tasks with prerequisite instance task execution (error)"] = function(test){
  var flow = new Flow([
    { authorName: 'Dan Brown',
      genreName: 'Fiction'
    },
    { authorName: 'Patricia Briggs',
      genreName: 'Robot Romance Novels'
    }
  ]);
  flow.tasks.getAuthor = new Flow.Task(Author.getByName, 'authorName');
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.assertGenreExistence = new Flow.Task(Genre.assertExistence, 'getGenre');
  flow.tasks.getBooks = new Flow.Task('getGenre.findBooksByAuthor', 'getAuthor').requires('assertGenreExistence');
  flow.execute(function(err, results){
    test.ok(err);
    test.equal(results[0], undefined);
    test.deepEqual(results[1], { 
      authorName: 'Patricia Briggs',
      genreName: 'Robot Romance Novels',
      getAuthor: { id: 1, name: 'Patricia Briggs' },
      getGenre: undefined,
      assertGenreExistence: undefined
    });
    test.done();
  });  
}

module.exports["task name same as instance method"] = function(test){
  var flow = new Flow({
    genreName: 'Fantasy'
  });
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.getBooks = new Flow.Task('getGenre.getBooks');
  flow.execute(function(err, results){
    test.ok(!err);
    test.deepEqual(results, {
      genreName: 'Fantasy',
      getGenre: Genre.all[1],
      getBooks: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]]
    });
    test.done();
  });
}

module.exports["undefined instance error"] = function(test){
  var flow = new Flow({
    genreName: 'Fictiony'
  });
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.getBooks = new Flow.Task('getGenre.getBooks');
  flow.execute(function(e, results){
    test.ok(e, 'got an error'); 
    test.equals(e.name, "ArgumentNullError", "got proper error");
    test.equals(e.message, 'Not Found: "getGenre" with genreName "Fictiony"')
    test.done();
  });
}

module.exports["undefined instance error 2"] = function(test){
  var flow = new Flow({
    genreName: 'Fiction'
  });
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.getBooks = new Flow.Task(Book.findByGenreId, 'getGenre.id.undef_value.err');
  flow.execute(function(e, results){
    test.ok(e, 'got an error'); 
    test.equals(e.name, "ArgumentNullError", "got proper error");
    test.equals(e.message, 'Not Found: "id.undef_value" with genreName "Fiction"')
    test.done();
  });
}

module.exports["function as arg error"] = function(test){
  try {
    var flow = new Flow({
      bookId: 1
    });
    flow.tasks.getBook = new Flow.Task(Book.getById, Book.getById, 'bookId');
    flow.execute(function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "TypeError", "got TypeError");
    test.equals(e.message, 'args must contain only string names of tasks or data.', "error message match")
    test.done();
  }
}

module.exports["unknown symbol error"] = function(test){
  var flow = new Flow({
    bookId: 1
  });
  flow.tasks.getBook = new Flow.Task(Book.getById, 'bookId');
  flow.tasks.getAuthor = new Flow.Task('getBook.notafunction');
  flow.execute(function(e, results){
    test.ok(e, 'got an error'); 
    test.equals(e.name, "FlowTaskError", "got FlowTaskError");
    test.equals(e.message, "Flow error in 'getAuthor': Unknown symbol 'notafunction' must be either the name of a task, the name of data, or the name of a function on 'getBook'", "error message match")
    test.done();
  });
}

module.exports["unknown symbol for first task argument"] = function(test){
  try {
    var flow = new Flow({
      bookId: 1
    });
    flow.tasks.getBook = new Flow.Task(Book.getById, 'bookId');
    flow.tasks.getAuthor = new Flow.Task('notafunction');
    flow.execute(function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, 'FlowTaskError')
    test.equals(e.message, "Flow error in 'getAuthor': Unknown string 'notafunction' must be either the name of a task or the name of data", "error message match")
    test.done();
  }
}

module.exports["undefined task argument error"] = function(test){
  try {
    var flow = new Flow({
      bookId: 1
    });
    flow.tasks.getBook = new Flow.Task(Book.getById, 'bookId');
    flow.tasks.getAuthor = new Flow.Task(Book.getAuthorByBookId, 'getBook');
    flow.execute(function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "ArgumentNullError", "got ArgumentNullError");
    test.equals(e.message, 'Missing argument: fn', "error message match")
    test.done();
  }
}

module.exports["missing task args error"] = function(test){
  try {
    var flow = new Flow({
      bookId: 1
    });
    flow.tasks.getBook = new Flow.Task(Book.getById, 'bookId');
    flow.tasks.getAuthor = new Flow.Task();
    flow.execute(function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "ArgumentNullError", "got ArgumentNullError");
    test.equals(e.message, "Missing argument: fn", "error message match")
    test.done();
  }
}

module.exports["missing function in task args error"] = function(test){
    var flow = new Flow({
      bookId: 1
    });
    flow.tasks.getBook = new Flow.Task(Book.getById, 'bookId');
    flow.tasks.getAuthor = new Flow.Task('getBook');
    flow.execute(function(e, results){
      test.ok(e, 'got an error'); 
      test.equals(e.name, "FlowTaskError", "got FlowTaskError");
      test.equals(e.message, "Flow error in 'getAuthor': Not a function: getBook", "error message match")
      test.done();
    });
}

module.exports["invalid flow type task"] = function(test){
  try {
    var flow = new Flow({
      bookId: 1
    });
    flow.tasks.getBook = new Flow.Task(Book.getById, 'bookId');
    flow.tasks.getAuthor = new Flow.Task(3);
    flow.execute(function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "TypeError", "got TypeError");
    test.equals(e.message, "Task fn must be a string or a function", "error message match")
    test.done();
  }
}

module.exports["error in task function"] = function(test){
  try {
    var flow = new Flow({
      bookId: 1
    });
    flow.tasks.getBook = new Flow.Task(Book.getById, 'bookId');
    flow.tasks.getAuthor = new Flow.Task(Author.getById);
    flow.execute(function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "FlowTaskError", "got FlowTaskError");
    test.equals(e.message, "Flow error in 'getAuthor': Error during execution of function.", "error message match")
    test.ok(/TypeError: undefined is not a function/.test(e.stack))
    test.done();
  }
}

module.exports["subFlow execution"] = function(test){
  var flow = new Flow({ 
    genreName: 'Fantasy'
  }), subflow;
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.getBooksByGenre = new Flow.Task('getGenre.getBooks');
  flow.tasks.getAuthors = subflow = new Flow('getBooksByGenre');
    subflow.tasks.getBookAuthor = new Flow.Task('getBooksByGenre.getAuthor');
  flow.execute(function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getAuthors: [{
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }]
    });
    test.done();
  });  
}

module.exports["subFlow execution with context"] = function(test){
  var flow = new Flow({ 
    genreName: 'Fantasy'
  }), subflow;
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.getBooksByGenre = new Flow.Task('getGenre.getBooks');
  flow.tasks.getAuthors = subflow = new Flow('getBooksByGenre');
    subflow.tasks.getBookAuthor = new Flow.Task(Author.getById, 'authorId');
  flow.execute(function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getAuthors: [{
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }]
    });
    test.done();
  });  
}

module.exports["subFlow execution using subFlow"] = function(test){
  var flow = new Flow({ 
    genreName: 'Fantasy'
  }), subflow;
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.getBooksByGenre = new Flow.Task('getGenre.getBooks');
  flow.tasks.getAuthors = subflow = new Flow('getBooksByGenre');
    subflow.tasks.getBookAuthor = new Flow.Task('getBooksByGenre.getAuthor');
  flow.execute(function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getAuthors: [{
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }]
    });
    test.done();
  });  
}

module.exports["subFlow execution with prereqs"] = function(test){
  var flow = new Flow({ 
    genreName: 'Fantasy',
    authorName: 'Barbara Hambly'
  });
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.getBooksByGenre = new Flow.Task('getGenre.getBooks');
  var subflow = flow.tasks.getAuthors = new Flow('getBooksByGenre');
    subflow.tasks.getHambly2 = new Flow.Task(Author.getById, 'getHambly');
  flow.tasks.getHambly = new Flow.Task(Author.getByName, 'authorName');
  flow.execute(function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      authorName: 'Barbara Hambly',
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getHambly: Author.all[6],
      getAuthors: [{
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }]
    });
    test.done();
  });  
}

/*
getAuthors: *getBooksByGenre, t.getBookAuthor, t.getBooksByAuthor, getHambly

*/
module.exports["two nested subflows with prereqs"] = function(test){
  var flow = new Flow({ 
    genreName: 'Fantasy',
    authorName: 'Barbara Hambly'
  });
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.getBooksByGenre = new Flow.Task('getGenre.getBooks');
  var subflow = flow.tasks.getAuthors = new Flow('getBooksByGenre');
    subflow.tasks.getBookAuthor = new Flow.Task('getBooksByGenre.getAuthor');
    subflow.tasks.getBooksByAuthor = new Flow.Task(Book.findByAuthorId, 'getBookAuthor');
    var subflow2 = subflow.tasks.getManyHamblies = new Flow('getBooksByAuthor');
      subflow2.tasks.getHambly2 = new Flow.Task(Author.getById, 'getHambly');
  flow.tasks.getHambly = new Flow.Task(Author.getByName, 'authorName');    
  flow.execute(function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      authorName: 'Barbara Hambly',
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getHambly: Author.all[6],
      getAuthors: [{
        getBookAuthor: Author.all[6],
        getBooksByAuthor: [Book.all[7], Book.all[8]],
        getManyHamblies: [{
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }]
      }, {
        getBookAuthor: Author.all[6],
        getBooksByAuthor: [Book.all[7], Book.all[8]],
        getManyHamblies: [{
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }]
      }, {
        getBookAuthor: Author.all[5],
        getBooksByAuthor: [Book.all[9], Book.all[10], Book.all[11]],
        getManyHamblies: [{
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }]
      }, {
        getBookAuthor: Author.all[5],
        getBooksByAuthor: [Book.all[9], Book.all[10], Book.all[11]],
        getManyHamblies: [{
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }]
      }, {
        getBookAuthor: Author.all[5],
        getBooksByAuthor: [Book.all[9], Book.all[10], Book.all[11]],
        getManyHamblies: [{
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }, {
          getHambly2: Author.all[6]
        }]
      }]
    });
    test.done();
  });  
}

module.exports["subflow with prereqs and result instance parameter"] = function(test){
  var flow = new Flow({ 
    genreName: 'Fantasy',
    authorName: 'Barbara Hambly'
  });
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.getBooksByGenre = new Flow.Task('getGenre.getBooks');
  var subflow = flow.tasks.getAuthors = new Flow('getBooksByGenre');
    subflow.tasks.getHambly2 = new Flow.Task(Author.getById, 'getHambly.id');
  flow.tasks.getHambly = new Flow.Task(Author.getByName, 'authorName');
  flow.execute(function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      authorName: 'Barbara Hambly',
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getHambly: Author.all[6],
      getAuthors: [{
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }, {
        getHambly2: Author.all[6]
      }]
    });
    test.done();
  });  
}

module.exports["subflow with empty name"] = function(test){
  try {
    var flow = new Flow({ 
      genreName: 'Fantasy'
    });
    flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
    flow.tasks.getBooksByGenre = new Flow.Task('getGenre.getBooks');
    var subflow = flow.tasks.getAuthors = new Flow('');
      subflow.tasks.getBookAuthor = new Flow.Task('getBooksByGenre.getAuthor');
    flow.execute(function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "ArgumentNullError", "got ArgumentNullError");
    test.equals(e.message, "Missing argument: data", "error message match")
    test.done();    
  }  
}

module.exports["subflow with no tasks"] = function(test){
  try {
    var flow = new Flow({ 
      genreName: 'Fantasy'
    });
    flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
    flow.tasks.getBooksByGenre = new Flow.Task('getGenre.getBooks');
    var subflow = flow.tasks.getAuthors = new Flow('getBooksByGenre');
    flow.execute(function(err, results){
      console.log(results);
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "Error", "got Error");
    test.equals(e.message, "No tasks given for Flow.", "error message match")
    test.done();    
  }  
}

module.exports["subflow with bad data name"] = function(test){
  try {
    var flow = new Flow({ 
      genreName: 'Fantasy'
    });
    flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
    flow.tasks.getBooksByGenre = new Flow.Task('getGenre.getBooks');
    var subflow = flow.tasks.getAuthors = new Flow('asdf');
      subflow.tasks.getBookAuthor = new Flow.Task('getBooksByGenre.getAuthor');
    flow.execute(function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "FlowTaskError", "got Error");
    test.equals(e.message, "Flow error in 'getAuthors': Subflow data 'asdf' does not exist. Provide the name of a flow, task or data from the parent flow.  Possible values include: genreName, getGenre, getBooksByGenre", "error message match")
    test.done();    
  }  
}


module.exports["subflow task with own data name"] = function(test){
  try {
    var flow = new Flow({ 
      genreName: 'Fantasy'
    });
    flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
    flow.tasks.getBooksByGenre = new Flow.Task('getGenre.getBooks');
    var subflow = flow.tasks.getAuthors = new Flow('getAuthors');
      subflow.tasks.getBookAuthor = new Flow.Task('getBooksByGenre.getAuthor');
    flow.execute(function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });
  } catch(e) {
    test.ok(e, 'got an error'); 
    test.equals(e.name, "FlowTaskError", "got Error");
    test.equals(e.message, "Flow error in 'getAuthors': Subflow data 'getAuthors' does not exist. Provide the name of a flow, task or data from the parent flow.  Possible values include: genreName, getGenre, getBooksByGenre", "error message match")
    test.done();    
  }  
}

module.exports["subflow with explicit prereq"] = function(test){
  var flow = new Flow({ 
    genreName: 'Fantasy'
  });
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.assertGenreExistence = new Flow.Task(Genre.assertExistence, 'getGenre');
  flow.tasks.getBooksByGenre = new Flow.Task('getGenre.getBooks');
  var subflow = flow.tasks.getAuthors = new Flow('getBooksByGenre').requires('assertGenreExistence');
    subflow.tasks.getBookAuthor = new Flow.Task(Author.getById, 'authorId');
  flow.execute(function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(subflow._plan.auto_task.slice(0, subflow._plan.auto_task.length - 1), ['getBooksByGenre', 'assertGenreExistence'])
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      assertGenreExistence: true,
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getAuthors: [{
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }]
    });
    test.done();
  });  
}

module.exports["subflow in task array with bad data name"] = function(test){
  try {
    var flow = new Flow({ 
      genreName: 'Fantasy'
    });
    flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
    flow.tasks.assertGenreExistence = new Flow.Task(Genre.assertExistence, 'getGenre');
    flow.tasks.getBooksByGenre = new Flow.Task('getGenre.getBooks');
    var subflow = flow.tasks.getAuthors = new Flow('asdf').requires('assertGenreExistence');
      subflow.tasks.getBookAuthor = new Flow.Task(Author.getById, 'authorId');
    flow.execute(function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });  
  } catch(e){
    test.ok(e, 'got an error'); 
    test.equals(e.name, "FlowTaskError", "got Error");
    test.equals(e.message, "Flow error in 'getAuthors': Subflow data 'asdf' does not exist. Provide the name of a flow, task or data from the parent flow.  Possible values include: genreName, getGenre, assertGenreExistence, getBooksByGenre", "error message match")
    test.done();
  }
}

module.exports["subflow in task array with own data name"] = function(test){
  try {
    var flow = new Flow({ 
      genreName: 'Fantasy'
    })
    flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
    flow.tasks.assertGenreExistence = new Flow.Task(Genre.assertExistence, 'getGenre');
    flow.tasks.getBooksByGenre = new Flow.Task('getGenre.getBooks');
    var subflow = flow.tasks.getAuthors = new Flow('getAuthors').requires('assertGenreExistence');
      subflow.tasks.getBookAuthor = new Flow.Task(Author.getById, 'authorId');
    flow.execute(function(err, results){
      test.fail(null, null, "no error received");
      test.done();
    });  
  } catch(e){
    test.ok(e, 'got an error'); 
    test.equals(e.name, "FlowTaskError", "got Error");
    test.equals(e.message, "Flow error in 'getAuthors': Subflow data 'getAuthors' does not exist. Provide the name of a flow, task or data from the parent flow.  Possible values include: genreName, getGenre, assertGenreExistence, getBooksByGenre", "error message match")
    test.done();
  }
}

module.exports["single data subflow execution"] = function(test){
  var flow = new Flow({ 
    genreName: 'Fantasy'
  });
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  var subflow = flow.tasks.getBooksByGenre = new Flow('getGenre');
    subflow.tasks.getBooksByGenre = new Flow.Task(Book.findByGenreId, 'id');
  flow.execute(function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      getGenre: Genre.all[1],
      getBooksByGenre: {
        getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]]
      }
    });
    test.done();
  });  
}

module.exports["single null data subflow execution"] = function(test){
  var flow = new Flow({ 
    genreName: 'Chainsaw slashers'
  });
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  var subflow = flow.tasks.getBooksByGenre = new Flow('getGenre');
    subflow.tasks.getBooksByGenre2 = new Flow.Task(Book.findByGenreId, 'id');
  flow.execute(function(e, results){
    test.ok(e, 'got an error'); 
    test.equals(e.name, "FlowTaskError", "got Error");
    test.equals(e.message, "Flow error in 'getBooksByGenre': Result of 'getGenre' returned no data. Could not start SubFlow.", "error message match")
    test.done();
  });
}

module.exports["subflow with result instance parameter"] = function(test){
  var flow = new Flow({ 
    genreName: 'Fantasy'
  });
  flow.tasks.getGenre = new Flow.Task(Genre.getByName, 'genreName');
  flow.tasks.getBooksByGenre = new Flow.Task('getGenre.getBooks');
  var subflow = flow.tasks.getAuthors = new Flow('getBooksByGenre');
    subflow.tasks.getBookAuthor = new Flow.Task(Author.getById, 'getBooksByGenre.authorId');
  flow.execute(function(err, results){
    test.ok(!err, 'no error');
    test.deepEqual(results, { 
      genreName: 'Fantasy',
      getGenre: Genre.all[1],
      getBooksByGenre: [Book.all[7], Book.all[8], Book.all[9], Book.all[10], Book.all[11]],
      getAuthors: [{
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[6]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }, {
        getBookAuthor: Author.all[5]
      }]
    });
    test.done();
  });  
}

module.exports["synchronous task execution"] = function(test){
  var flow = new Flow({
    id: 3,
    new_object: {}
  });
  flow.tasks.getBook = new Flow.Task(Book.getById, 'id');
  flow.tasks.getAuthor = new Flow.Task(Author.getById, 'getBook.authorId');
  var t = flow.tasks.getBookAuthorData = new Flow.Fn(us.extend, 'new_object', 'getBook', 'getAuthor');
  flow.execute(function(err, results){
    test.deepEqual({
      id: 3,
      new_object: us.extend({}, Book.all[3], Author.all[1]),
      getBook: Book.all[3],
      getAuthor: Author.all[1],
      getBookAuthorData: us.extend({}, Book.all[3], Author.all[1])
    }, results);
    test.done();
  });
}


