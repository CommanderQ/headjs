/*!
 * HeadJS     The only script in your <HEAD>    
 * Author     Tero Piirainen  (tipiirai)
 * Maintainer Robert Hoffmann (itechnology)
 * License    MIT / http://bit.ly/mit-license
 *
 * Version 0.99
 * http://headjs.com
 */
; (function (win, undefined) {
    "use strict";

    //#region The Deferred and Promise implementation

    // Define the Promise and Deferred instances within the local asynchrony namespace.
    // We'll use these to represent and coordinate the script loading and fallback.
    var asynchrony = {};

    /*
        Promises, Promises...
        A light-weight implementation of the Promise/A+ specification (http://promises-aplus.github.io/promises-spec/) and an underlying deferred-execution (i.e. future) provider.
        This library is meant to provide core functionality required to leverage Promises / futures within larger libraries via bundling or otherwise inclusion within larger files.
    
        Author:     Mike McMahon
        Created:    September 5, 2013
    
        Version:    1.0
        Updated:    September 5, 2013
    
        Project homepage: http://promises.codeplex.com
    */

    /* License and copyright information (Ms-PL): http://promises.codeplex.com */
    (function (container, undefined) {
        /// <summary>
        ///     Initializes the types and functionality of the library within a container.
        ///     After execution, the container will contain two new types:
        ///         Promise
        ///         Deferred
        /// </summary>
        /// <param name="container" type="Object">The object to which the types of this library are attached.</param>
        /// <param name="undefined" type="Object">An instance of the browser 'undefined' object.</param>

        "use strict";

        //#region Utility Methods

        function isFunction(functionToCheck) {
            /// <summary>Determines whether a parameter represents a function.</summary>
            /// <param name="functionToCheck" type="Object">An object to examine.</param>
            /// <returns type="Boolean">Whether the object is a function.</returns>

            var getType = {};
            return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
        }

        //#endregion

        //#region The Promise type

        function Promise(thenMethod) {
            /// <summary>
            /// A Promise or future - as defined by the Promise/A+ specification (http://promises-aplus.github.io/promises-spec/) - which represents a value that may not yet be available.
            /// Each new instance wraps an existing Deferred object to expose only the Promise/A functionality, preventing modification of the underlying Deferred.
            /// </summary>
            /// <param name="thenMethod" type="Function([onFulfilled], [onRejected])">A method that fulfills the requirements of the Promise/A+ "then" method.</param>

            /// <field name="then" type="Function([success], [failure])">Registers a continuation for this promise using the specified functions, both of which are optional.</field>
            this.then = thenMethod;
        }

        //#endregion

        //#region The private InnerDeferred type

        // Define an inner Deferred object that we use to represent the internal functionality, hiding internal implementation details.
        function InnerDeferred() {
            /// <summary>
            /// Represents a future - an operation that will complete in the future, optionally producing a result.
            /// The creator of a Deferred may resolve it if it successfully completes, or reject it if an error occurs.
            /// A Deferred implements the Promise class, supporting the attachment of an arbitrary number of fulfilled and / or rejected callbacks via the "then" method.
            /// These callbacks are invoked (as appropriate) when the Deferred is either fulfilled or rejected - no order is guaranteed.
            /// This internal representation stores its necessary internal data, allowing the methods to be defined on the prototype.
            /// </summary>

            // Initialize the state of the Deferred.
            /// <field name="state" type="Number">The state of the deferred object.</field>
            this.state = Deferred.States.Pending;

            /// <field name="resultData" type="Object">Any result data associated with this instance, whether for fulfillment or rejection.</field>
            this.resultData;

            /// <field name="fulfilledContinuations" type="Array" elementType="Function">The list of continuation methods to be executed when this instance is fulfilled.</field>
            this.fulfilledContinuations = [];

            /// <field name="rejectedContinuations" type="Array" elementType="Function">The list of continuation methods to be executed when this instance is rejected.</field>
            this.rejectedContinuations = [];
        }

        InnerDeferred.prototype.reject = function (data) {
            /// <summary>Resolves this Deferred as having been rejected, passing an optional result value.</summary>
            /// <param name="result" type="Object">Any data to be passed as the result of this Deferred to its rejection handlers.</param>

            if (this.state === Deferred.States.Pending) {
                this.state = Deferred.States.Rejected;
                this.resultData = data;

                // Execute the failure callbacks.
                while (this.rejectedContinuations.length > 0) {
                    this.rejectedContinuations.shift()(this.resultData);
                }

                // Clear the fulfillment continuations.
                this.fulfilledContinuations = null;
            }
        };

        InnerDeferred.prototype.fulfill = function (result) {
            /// <summary>Resolves this Deferred as having been fulfilled, passing an optional result value.</summary>
            /// <param name="result" type="Object">Any data to be passed as the result of this Deferred to its fulfillment handlers.</param>

            if (this.state === Deferred.States.Pending) {
                this.state = Deferred.States.Fulfilled;
                this.resultData = result;

                // Execute the fulfillment callbacks.
                while (this.fulfilledContinuations.length > 0) {
                    this.fulfilledContinuations.shift()(this.resultData);
                }

                // Clear out the rejection continuations.
                this.rejectedContinuations = null;
            }
        };

        InnerDeferred.prototype.then = function (onFulfilled, onRejected) {
            /// <summary>Registers a continuation for this promise using the specified handlers, both of which are optional, following the Promises/A+ specification.</summary>
            /// <param name="onFulfilled" type="function">A method that is executed if this promise is resolved successfully, accepting the result of the promise (if any) as a parameter.</param>
            /// <param name="onRejected" type="function">A method that is executed if this promise is resolved unsuccessfully (i.e. rejected), accepting the result of the promise (if any) as a parameter.</param>
            /// <returns type="Promise">A Promise with the characteristics defined by the Promises/A+ specification. If neither onFulfilled nor onRejected are valid functions, this method returns the current Promise; otherwise, a new Promise is returned.</returns>

            // If we aren't passed any valid callbacks, just return the current Promise to save on allocations.
            if (!isFunction(onFulfilled) && !isFunction(onRejected)) {
                return this;
            }

            // Per the Promise/A specification:
            //  This function should return a new promise that is fulfilled when the given success or failure callback is finished.
            //  This allows promise operations to be chained together.
            //  The value returned from the callback handler is the fulfillment value for the returned promise. If the callback throws an error, the returned promise will be moved to failed state. 
            var continuation = new Deferred();

            // If we have no valid onFulfilled method, use the fulfill method of the Deferred to allow chaining.
            if (!isFunction(onFulfilled)) {
                onFulfilled = continuation.fulfill;
            }

            // If we have no valid onRejected method, use the reject method of the Deferred to allow chaining.
            if (!isFunction(onRejected)) {
                onRejected = continuation.reject;
            }

            // Define the action to take upon successful resolution, wrapping the success handler within the continuation appropriately.
            var successHandler = function (successData) {

                // Queue the execution.
                setTimeout(function () {
                    var continuationResult;

                    // Try to get the result to pass to the continuation from the handler.
                    try {
                        // Resolve the continuation, passing the return value from the success handler.
                        var fulfilledData = onFulfilled(successData);

                        // If the return value is a Promise, we have to assume its value.
                        // Otherwise, we just fulfill the continuation.
                        if (!!fulfilledData && isFunction(fulfilledData.then)) {

                            // The return value is a Promsie, so, per the specification, we require the returned Promise to assume its value.
                            fulfilledData.then(continuation.fulfill, continuation.reject);
                        }
                        else {

                            // Fulfill the continaution.
                            continuation.fulfill(fulfilledData);
                        }
                    }
                    catch (failureHandlerError) {
                        // The failure handler threw an error, so we fail the continuation and pass it the exception as data.
                        continuation.reject(failureHandlerError);
                    }
                }, 0);
            };

            // Take appropriate action based upon whether this operation has already been resolved.
            if (this.state === Deferred.States.Fulfilled) {
                // Invoke the handler, sending in the completion data.
                successHandler(this.resultData);
            }
            else if (this.state === Deferred.States.Pending) {
                // The operation hasn't been resolved, so we queue it up.
                this.fulfilledContinuations.push(successHandler);
            }


            // Define the action to take when the Deferred fails, wrapping the success handler appropriately.
            var failureHandler = function (failureData) {

                // Queue the execution.
                setTimeout(function () {
                    var continuationResult;

                    // Try to get the result to pass to the continuation from the handler.
                    try {
                        // Resolve the continuation, passing the return value from the success handler.
                        var rejectionResult = onRejected(failureData);

                        // If the return value is a Promise, we have to assume its value.
                        // Otherwise, we just fulfill the continuation.
                        if (!!rejectionResult && isFunction(rejectionResult.then)) {

                            // The return value is a Promise, so, per the specification, we require the returned Promise to assume its value.
                            rejectionResult.then(continuation.fulfill, continuation.reject);
                        }
                        else {

                            // Reject the continuation.
                            continuation.reject(rejectionResult);
                        }
                    }
                    catch (failureHandlerError) {
                        // The failure handler threw an error, so we reject the continuation and pass it the exception as data.
                        continuation.reject(failureHandlerError);
                    }
                }, 0);
            };

            // Take appropriate action based upon whether this operation has already been resolved.
            if (this.state === Deferred.States.Rejected) {
                // Invoke the handler, sending in the completion data.
                failureHandler(this.resultData);
            }
            else if (this.state === Deferred.States.Pending) {
                // The operation hasn't been resolved, so we queue it up.
                this.rejectedContinuations.push(failureHandler);
            }

            // Return the promise object for the continuation.
            return continuation.promise();
        };

        //#endregion

        //#region The Deferred type

        //#region Deferred

        // Define the constructor for the exposed object.
        function Deferred() {
            /// <summary>
            /// Represents a future - an operation that will complete in the future, optionally producing a result.
            /// The creator of a Deferred may resolve it if it successfully completes, or reject it if an error occurs.
            /// A Deferred implements the Promise class, supporting the attachment of an arbitrary number of success and / or error callbacks via the "then" method.
            /// These callbacks are invoked (as appropriate) when the Deferred is either resolved or rejected.
            /// </summary>

            // Initialize the Deferred using an InnerDeferred, which defines all the operations and contains all the state.
            // This wrapper simply exposes selective pieces of it.
            var inner = new InnerDeferred();

            this.getState = function () {
                /// <summary>
                /// Gets the state of this Deferred.
                /// </summary>
                /// <returns type="Number">A value from the Deferred.States enumeration.</returns>

                return inner.state;
            };

            this.promise = function () {
                /// <summary>
                /// Returns a Promise that wraps this instance, exposing only the "then" method.
                /// </summary>
                /// <returns type="Promise">A Promise that represents this deferred.</returns>

                return new Promise(this.then);
            };

            this.reject = function (data) {
                /// <summary>Resolves this Deferred as having failed, passing an optional result.</summary>
                /// <param name="result" type="Object">Any data to be passed as the result of this Deferred to its failure handlers.</param>

                inner.reject(data);
            }

            this.fulfill = function (result) {
                /// <summary>Resolves this Deferred as having completed successfully, passing an optional result.</summary>
                /// <param name="result" type="Object">Any data to be passed as the result of this Deferred to its success handlers.</param>

                inner.fulfill(result);
            }

            this.then = function (onFulfilled, onRejected) {
                /// <summary>Registers a continuation for this promise using the specified handlers, both of which are optional.</summary>
                /// <param name="onFulfilled" type="function">A method that is executed if this promise is fulfilled (i.e. completes successfully), accepting the result of the promise (if any) as a parameter.</param>
                /// <param name="onRejected" type="function">A method that is executed if this promise is rejected (i.e. completes with an error), accepting the result of the promise (if any) as a parameter.</param>
                /// <returns type="Promise">A continuation of this Promise that is resolved when either the success or failure handler is done executing.</returns>

                return inner.then(onFulfilled, onRejected);
            }
        }

        //#endregion

        //#region Enumerations

        /// <var type="Object">Possible states of a Deferred.</var>
        Deferred.States = {

            /// <field name="Pending" static="true">Awaiting completion (i.e. neither resolved nor rejected).</field>
            Pending: 0,

            /// <field name="Fulfilled" static="true">Completed successfully (i.e. success).</field>
            Fulfilled: 1,

            /// <field name="Rejected" static="true">Completed erroneously (i.e. failure).</field>
            Rejected: 2
        };

        //#endregion

        //#endregion

        //#region Promise enhancements

        // Enhance the Promise type with (effectively) extension methods that leverage the Deferred.

        //#region Static Members

        Promise.rejected = (function () {
            /// <summary>Creates a single instance of a Promise that has been rejected (i.e. completed with an error).</summary>
            /// <returns type="Promise">A Promise that has been rejected (i.e. completed with an error).</returns>

            // Resolve a Deferred to represent a failed one, returning it.
            var completed = new Deferred();
            completed.reject();
            return completed.promise();
        }());

        /// <field name="never" type="Promise">A Promise that will never be completed.</field>
        Promise.never = new Promise(function () { });

        Promise.fulfilled = (function () {
            /// <summary>Creates a single instance of a fulfilled (i.e. successfully-resolved) Promise.</summary>
            /// <returns type="Promise">A Promise that has been fulfilled.</returns>

            // Resolve a Deferred to represent a completed one, returning it.
            var completed = new Deferred();
            completed.fulfill();
            return completed.promise();
        }());

        //#endregion

        //#region Static Methods

        Promise.whenAll = function (promises) {
            /// <summary>
            /// Creates a Promise that is fulfilled when all the specified Promises are fulfilled, or rejected when one of the Promises is rejected.
            /// </summary>
            /// <param name="promises" type="Array" elementType="Promise">A set of promises to represent.</param>
            /// <returns type="Promise">A Promise that is fulfilled when all the specified Promises are fulfilled, or rejected when one of the Promises is rejected.</returns>

            // Take action depending upon the number of Promises passed.
            if (promises.length == 0) {

                // There are no arguments, so we return a completed Promise.
                return Promise.fulfilled;
            }
            else if (promises.length == 1) {

                // There's only one Promise, so return it.
                return promises[0];
            }
            else {

                // Create a new Deferred to represent the entire process.
                var whenAll = new Deferred();

                // Wire into each Promise, counting them as they complete.
                // We count manually to filter out any odd, null entries.
                var pendingPromises = 0;

                for (var i = 0; i < promises.length; i++) {
                    var promise = promises[i];

                    // Increment the total count and store the promise, then wire-up the promise.
                    pendingPromises++;

                    promise.then(function () {

                        // Completed successfully, so decrement the count.
                        pendingPromises--;

                        // If this is the last promise, resolve it, passing the promises.
                        // If a failure occurred already, this will have no effect.
                        if (pendingPromises == 0) {
                            whenAll.fulfill();
                        }
                    },
                    function (data) {

                        // A failure occurred, so decrement the count and reject the Deferred, passing the error / data that caused the rejection.
                        // A single failure will cause the whole set to fail.
                        pendingPromises--;
                        whenAll.reject(data);
                    });
                }

                // Return the promise.
                return whenAll.promise();
            }
        };

        //#endregion

        //#endregion

        // Assign the Promise and Deferred objects to the namespace.
        container.Deferred = Deferred;
        container.Promise = Promise;

    }(asynchrony));

    // Expose the asynchrony classes to the rest of this instance.
    var Deferred = asynchrony.Deferred,
        Promise = asynchrony.Promise;

    //#endregion

    //#region The Asset type

    var Asset = (function () {

        // Define the Asset type and constructor.
        function Asset(name, sources) {
            /// <summary>
            /// A named asset to be loaded.
            /// </summary>
            /// <param name="name" type="String">The name of the Asset.</param>
            /// <param name="sources" type="Array" elementType="String">The orderrd list of sources for the asset.</param>
            /// <field name="name" type="String">The name of the asset.</field>
            /// <field name="location" type="String">The location from which the asset was loaded.</field>
            /// <field name="sources" type="Array" elementType="String">The ordered list of locations from which the asset can be loaded.</field>
            /// <field name="loadTest" type="Function">A predicate that verifies whether the asset has been loaded (for older browsers).</field>

            // Store the values.
            this.name = name;
            this.sources = [];

            // Iterate through the sources provided, splitting out any test predicate from any source addresses.
            var filteredSources = [],
                extractedLoadTest;
            each(sources, function (s) {
                if (isFunction(s)) {
                    extractedLoadTest = s;
                }
                else {
                    filteredSources.push(s);
                }
            });

            this.loadTest = extractedLoadTest;
            this.sources = filteredSources;

            // Initialize the location and state.
            this.location = null;
            this.state = 0;

            // Initialize the Promise functionality of the asset.
            // We add the "then" method to allow the Asset to act like a Promise.
            this.deferred = new Deferred();
            this.then = this.deferred.then;
        }

        // Define the states.
        Asset.States = {
            UNLOADED: 0,
            LOADING: 1,
            LOADED: 2,
            FAILED: 3
        };

        // Define the utility method that loads a single asset into the DOM.
        function loadAssetAsync(location, test, cache) {
            /// <summary>Loads an asset into the DOM asynchronously.</summary>
            /// <param name="asset" type="String">The location of the asset to load.</param>
            /// <param name="test" type="Function">An optional predicate function used to test whether the asset has been loaded on older browsers.</param>
            /// <param name="cache" type="Boolean">Whether this asset should be loaded into the cache. The default is false.</param>
            /// <returns type="Promise">A Promise that represents the operation.</returns>

            // Represent the process as a Deferred.
            var assetDeferred = new Deferred();

            var ele;

            if (/\.css[^\.]*$/.test(location)) {
                ele = doc.createElement('link');
                ele.type = 'text/' + (cache ? 'cache' : 'css');
                ele.rel = 'stylesheet';
                ele.href = location;
            }
            else {
                ele = doc.createElement('script');
                ele.type = 'text/' + (cache ? 'cache' : 'javascript');
                ele.src = location;
            }

            // Determine whether the browser supports reporting errors (< IE 9 don't).
            var reportsErrors = !!ele.onerror;

            // Define the methods we use to handle changes in the DOm element state, translating them into Deferred state changes.
            function error(event) {
                event = event || win.event;

                // release event listeners
                ele.onload = ele.onreadystatechange = ele.onerror = null;

                // Remove the element from the DOM since it failed.
                // This is optional, but it keeps the DOM tidy.
                ele.parentElement.removeChild(ele);

                // Reject the Deferred, passing the event.
                assetDeferred.reject(event);
            }

            function process(event) {
                event = event || win.event;

                // IE 7/8 (2 events on 1st load)
                // 1) event.type = readystatechange, s.readyState = loading
                // 2) event.type = readystatechange, s.readyState = loaded

                // IE 7/8 (1 event on reload)
                // 1) event.type = readystatechange, s.readyState = complete 

                // event.type === 'readystatechange' && /loaded|complete/.test(s.readyState)

                // IE 9 (3 events on 1st load)
                // 1) event.type = readystatechange, s.readyState = loading
                // 2) event.type = readystatechange, s.readyState = loaded
                // 3) event.type = load            , s.readyState = loaded

                // IE 9 (2 events on reload)
                // 1) event.type = readystatechange, s.readyState = complete 
                // 2) event.type = load            , s.readyState = complete 

                // event.type === 'load'             && /loaded|complete/.test(s.readyState)
                // event.type === 'readystatechange' && /loaded|complete/.test(s.readyState)

                // IE 10 (3 events on 1st load)
                // 1) event.type = readystatechange, s.readyState = loading
                // 2) event.type = load            , s.readyState = complete
                // 3) event.type = readystatechange, s.readyState = loaded

                // IE 10 (3 events on reload)
                // 1) event.type = readystatechange, s.readyState = loaded
                // 2) event.type = load            , s.readyState = complete
                // 3) event.type = readystatechange, s.readyState = complete 

                // event.type === 'load'             && /loaded|complete/.test(s.readyState)
                // event.type === 'readystatechange' && /complete/.test(s.readyState)

                // Other Browsers (1 event on 1st load)
                // 1) event.type = load, s.readyState = undefined

                // Other Browsers (1 event on reload)
                // 1) event.type = load, s.readyState = undefined            

                // event.type == 'load' && s.readyState = undefined


                // !doc.documentMode is for IE6/7, IE8+ have documentMode
                if (event.type === 'load' || (/loaded|complete/.test(ele.readyState) && (!doc.documentMode || doc.documentMode < 9))) {

                    // release event listeners               
                    ele.onload = ele.onreadystatechange = ele.onerror = null;

                    // The browser says that the assetis loaded, but if the browser was too old, it wouldn't report an error.
                    // Therefore, if the browser doesn't support proper errors, run any load test for the asset.
                    // If it fails, run the error handler.
                    // Otherwise, assume everything went to plan.
                    if (!reportsErrors && !!test && !cache && !test()) {

                        // Fail the Deferred since the test failed.
                        error(event);
                    }
                    else {

                        // Resolve the Deferred.
                        assetDeferred.fulfill();
                    }
                }

                // emulates error on browsers that don't create an exception
                // INFO: timeout not clearing ..why ?
                //asset.timeout = win.setTimeout(function () {
                //    error({ type: "timeout" });
                //}, 3000);
            }

            // Wire-up the DOM element change handlers, knowing that the error event may not be present.
            ele.onload = ele.onreadystatechange = process;
            ele.onerror = error;

            //ele.onload = ele.onreadystatechange = process;
            //ele.onerror = error;

            /* Good read, but doesn't give much hope !
             * http://blog.getify.com/on-script-loaders/
             * http://www.nczonline.net/blog/2010/12/21/thoughts-on-script-loaders/
             * https://hacks.mozilla.org/2009/06/defer/
             */

            // ASYNC: load in parallel and execute as soon as possible
            ele.async = false;
            // DEFER: load in parallel but maintain execution order
            ele.defer = false;

            // use insertBefore to keep IE from throwing Operation Aborted (thx Bryan Forbes!)
            var head = doc.head || doc.getElementsByTagName('head')[0];
            // but insert at end of head, because otherwise if it is a stylesheet, it will not ovverride values
            head.insertBefore(ele, head.lastChild);

            // Return the promise of the Deferred.
            return assetDeferred.promise();
        }

        Asset.prototype.loadAsync = function (cache) {
            /// <summary>
            /// Loads an asset asynchronously.
            /// This initiates the single loading attempt that can be made on an asset.
            /// </summary>
            /// <param name="cache" type="Boolean">Whether this asset should be loaded into the cache. The default is false. Note that cache loads will never fail as they cannot be tested.</param>
            /// <returns type="Promise">The Promise that represents the act of loading the asset.</returns>

            // If the asset is already loading, just return the promise (which is the asset).
            // If we have no sources, we also do nothing and just return the promise.
            if ((this.state !== Asset.States.UNLOADED) || (this.sources.length == 0)) {
                return this;
            }

            // Define our actions and track our index.
            var currentSourceIndex = -1,    // Start at -1 so that we can use the failure handler.
                self = this,    // Keep a reference to this instance.
                assetLoaded = function () {
                    // We succeeded, so set the final properties resolve the Deferred of the instance.
                    self.state = Asset.States.LOADED;
                    self.location = self.sources[currentSourceIndex];
                    self.deferred.fulfill();
                },
                assetFailed;

            // We define the failure handler recursively so that we can self terminate and start with a call to it.
            assetFailed = function () {

                // Increment the index.
                currentSourceIndex++;

                // If we have another asset to try, do so.
                // Otherwise, reject the Deferred.
                if (currentSourceIndex < self.sources.length) {

                    // Try the next source, wiring-up the continuation.
                    loadAssetAsync(self.sources[currentSourceIndex], self.loadTest, cache).then(assetLoaded, assetFailed);
                }
                else {

                    // There's nothing else to try, so reject the deferred.
                    self.state = Asset.States.FAILED;
                    self.deferred.reject();
                }
            };

            // Indicate that we've entered the loading state, then start loading with a call to the failed handler.
            self.state = Asset.States.LOADING;
            assetFailed();

            // Return this instance as the Promise.
            return this;
        };

        // Return the Asset itself, which is also a Promise.
        return Asset;
    }());

    //#endregion

    //#region Initialization

    function initializeDOMReadiness(win, doc) {
        /// <summary>Initializes DOM readiness tracking.</summary>
        /// <param name="win" type="Window">The containing window.</param>
        /// <param name="doc" type="Document">The document contained within the window.</param>
        /// <returns type="Promise">A Promise that represents when the DOM is ready.</returns>


        // Create a Deferred to represent the process.
        var domReadiness = new Deferred(),
            domReadyTimeout;

        /* Mix of stuff from jQuery & IEContentLoaded
         * http://dev.w3.org/html5/spec/the-end.html#the-end
         ***************************************************/
        function domReady() {
            // Make sure body exists, at least, in case IE gets a little overzealous (jQuery ticket #5443).
            if (!doc.body) {
                // let's not get nasty by setting a timeout too small.. (loop mania guaranteed if assets are queued)
                win.clearTimeout(domReadyTimeout);
                domReadyTimeout = win.setTimeout(domReady, 50);
                return;
            }

            // The DOM is ready, so resolve the deferred.
            domReadiness.fulfill();
        }

        function domContentLoaded() {
            // W3C
            if (doc.addEventListener) {
                doc.removeEventListener("DOMContentLoaded", domContentLoaded, false);
                domReady();
            }

                // IE
            else if (doc.readyState === "complete") {
                // we're here because readyState === "complete" in oldIE
                // which is good enough for us to call the dom ready!            
                doc.detachEvent("onreadystatechange", domContentLoaded);
                domReady();
            }
        }

        // Catch cases where ready() is called after the browser event has already occurred.
        // we once tried to use readyState "interactive" here, but it caused issues like the one
        // discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15    
        if (doc.readyState === "complete") {
            domReady();
        }

            // W3C
        else if (doc.addEventListener) {
            doc.addEventListener("DOMContentLoaded", domContentLoaded, false);

            // A fallback to window.onload, that will always work
            win.addEventListener("load", domReady, false);
        }

            // IE
        else {
            // Ensure firing before onload, maybe late but safe also for iframes
            doc.attachEvent("onreadystatechange", domContentLoaded);

            // A fallback to window.onload, that will always work
            win.attachEvent("onload", domReady);

            // If IE and not a frame
            // continually check to see if the document is ready
            var top = false;

            try {
                top = win.frameElement == null && doc.documentElement;
            } catch (e) { }

            if (top && top.doScroll) {
                (function doScrollCheck() {
                    if (domReadiness.getState() === Deferred.States.Pending) {
                        try {
                            // Use the trick by Diego Perini
                            // http://javascript.nwbox.com/IEContentLoaded/
                            top.doScroll("left");
                        } catch (error) {
                            // let's not get nasty by setting a timeout too small.. (loop mania guaranteed if assets are queued)
                            win.clearTimeout(domReadyTimeout);
                            domReadyTimeout = win.setTimeout(doScrollCheck, 50);
                            return;
                        }

                        // and execute any waiting functions
                        domReady();
                    }
                })();
            }
        }

        // Return the Promise of the Deferred.
        return domReadiness.promise();
    }

    function initializeHeadReadiness(domReady) {
        /// <summary>Initializes document head readiness tracking.</summary>
        /// <param name="domReady" type="Promise">The Promise that represents DOM readiness.</param>
        /// <returns type="Promise">A Promise that represents when the document head is ready.</returns>

        // Create a Deferred to represent the process.
        var headReady = new Deferred();

        /*
            We wait for 300 ms before asset loading starts. for some reason this is needed
            to make sure assets are cached. Not sure why this happens yet. A case study:
    
            https://github.com/headjs/headjs/issues/closed#issue/83
        */
        setTimeout(headReady.fulfill, 300);

        // We also resolve the head readiness early if the DOM reports as loaded.
        domReady.then(headReady.fulfill, headReady.reject);

        // Return the Promise.
        return headReady.promise();
    }

    //#endregion

    //#region Load Methods

    function loadAssets(items) {

        // Track the assets that we start loading.
        var loadingAssets = [];

        each(items, function (item, i) {
            if (!isFunction(item)) {

                // Get / parse the asset, adding it to our list.
                item = getAsset(item);
                loadingAssets.push(item);

                // Load the item.
                item.loadAsync();
            }
        });

        // Return the list of assets we're loading.
        return loadingAssets;
    }

    function preLoadAssets(items) {

        // Track the assets that we load.
        var loadingAssets = [];

        /* Preload with text/cache hack (not good!)
         * http://blog.getify.com/on-script-loaders/
         * http://www.nczonline.net/blog/2010/12/21/thoughts-on-script-loaders/
         * If caching is not configured correctly on the server, then items could load twice !
         *************************************************************************************/

        function preLoadAsset(asset, dependencies) {
            /// <summary>Loads an asset via the fallback cache-load mechanism.</summary>
            /// <param name="asset" type="Asset"></param>
            /// <param name="dependencies" type="Array" elementType="Promise"></param>
            /// <returns type="Promise">The Promise that completes when the asset is loaded, or fails to load.</returns>

            // If the asset has no sources, we can't do anything, so we return the asset itself (it's a Promise) to allow chaining.
            if (asset.sources.length == 0) {
                return asset;
            }

            // Define the method that we'll normally use, which loads a cache asset, then its associated non-cache (i.e. real) asset into the DOM.
            function preLoadAssetPair(asset, source) {

                // Create the asset pair using the provided source, copying the test over.
                var cacheItem = new Asset(asset.name, [source]),
                    actualItem = new Asset(asset.name, [source]);
                actualItem.loadTest = asset.loadTest;

                // Return the Promise that represents the cache item loading, followed by the actual item.
                return cacheItem.loadAsync(true).then(function () {
                    return actualItem.loadAsync();
                });
            }

            // Create a Deferred to represent the process, which is rather complex because of the cache entries and tests.
            var assetLoad = new Deferred();

            // We break each iteration of the sources into two steps: load the cache item, then try loading the actual item.
            // We have to do this for each source in the Asset in a structured way to ensure that dependencies are observed, though we can sneak a little ahead with the first cache entry.
            var sources = asset.sources.slice(),
                currentSourceIndex = 0,
                cacheLoad = new Asset(asset.name, [sources[currentSourceIndex]]).loadAsync(true),
                currentDependencies = dependencies.slice();

            // Add the cache loading Promise to our list of current dependencies.
            currentDependencies.push(cacheLoad);

            // Wait until the dependencies have been resolved before we try to actually load the asset from the cache.
            // This ensures we preserve the ordering before we start altering the DOM with executable code.
            Promise.whenAll(currentDependencies).then(function () {

                // The dependencies and initial cache item are loaded, so we can try to load the real item, which we can test for success.
                var assetSourceLoad = new Asset(asset.name, [sources[currentSourceIndex]]),
                    assetFailedHandler;
                assetSourceLoad.loadTest = asset.loadTest;

                // Define the asset failure handler, which iterates through subsequent sources.
                assetFailedHandler = function () {

                    // This asset failed, so we have to try other asset pairs.
                    // All the dependencies are already loaded, so we just iterate through any remaining sources.
                    // Start by incrementing the index counter, then continuing to load the asset pairs.
                    currentSourceIndex++;

                    if (currentSourceIndex < sources.length) {

                        // Try the next source, wiring up handlers appropriately.
                        preLoadAssetPair(asset, sources[currentSourceIndex]).then(assetLoad.fulfill, assetFailedHandler);
                    }
                    else {
                        // There are no more sources, so we fail.
                        assetLoad.reject();
                    }
                };

                // Try to load the actual first item, handling success or failure appropriately.
                assetSourceLoad.loadAsync().then(assetLoad.fulfill, assetFailedHandler);

            }, function () {

                // We couldn't resolve our dependencies, so we fail or the cache load (not really possible), so we fail overall.
                assetLoad.reject();
            });

            // Return the Promise that represents this asset being loaded.
            return assetLoad.promise();
        }

        // Iterate through the arguments, pre-loading, then loading each one.
        each(items, function (userItem, i) {
            if (!isFunction(userItem)) {

                // Get / parse the asset, which adds it to the global list.
                var item = getAsset(userItem);

                // The dependencies for this item / asset are all prior scripts that have been queued.
                // When the pre-load completes (either way), we try to load the actual item.
                // The test for the item will determine the final state since the preLoadAsset method will have actually loaded the asset.
                var dependencies = loadingAssets.slice(),
                    preLoad = preLoadAsset(item, dependencies).then(function () { item.loadAsync() }, function () { item.loadAsync() });

                // Add the actual (i.e. final) asset to the list.
                loadingAssets.push(item);
            }
        });

        // Return the list of assets we're loading.
        return loadingAssets;
    }

    //#endregion

    var doc = win.document,
        assets = {}, // loadable items in various states
        isAsync = "async" in doc.createElement("script") || "MozAppearance" in doc.documentElement.style || win.opera,

        // Promises about the document, used for synchronization and sequencing.
        domReady = initializeDOMReadiness(win, doc),
        headReady = initializeHeadReadiness(domReady),

        /*** public API ***/
        headVar = win.head_conf && win.head_conf.head || "head",
        api = win[headVar] = (win[headVar] || function () { api.ready.apply(null, arguments); });

    //#region Exposed API methods and types

    // Expose the Promise mechanisms for reuse.
    api.Deferred = Deferred;
    api.Promise = Promise;

    api.load = function () {
        ///<summary>
        /// INFO: use cases
        ///    head.load("http://domain.com/file.js","http://domain.com/file.js", callBack)
        ///    head.load({ label1: "http://domain.com/file.js" }, { label2: "http://domain.com/file.js" }, callBack)
        ///    
        ///    Multiple sources (i.e. automatic fallback locations)
        ///    head.load({ label1: ["http://source1.com/file.js", "http://source2.com/file.js", "http://source3.com/file.js"] }, { label2:  ["http://source1.com/file.js", "http://source2.com/file.js", "http://source3.com/file.js"] }, callBack)
        ///    
        ///    Multiple sources (i.e. automatic fallback locations), including a load test that supports load detection on older browsers.
        ///    head.load({ label1: ["http://source1.com/file.js", "http://source2.com/file.js", "http://source3.com/file.js", function(){return <something that indicates the file was loaded>;}] }, { label2:  ["http://source1.com/jQuery.js", "http://source2.com/jQuery.js", "http://source3.com/jQuery.js", function(){ return !!window.jQuery;}] }, callBack)
        ///</summary> 
        var args = arguments,
             callback = args[args.length - 1],
            allDone;

        if (!isFunction(callback)) {
            callback = null;
        }

        // Take action depending upon whether the browser supports asynchronous script loading.
        if (isAsync) {
            // Method 1: simply load and let browser take care of ordering
            var loadedItems = loadAssets(args);

            // When all the items are loaded, run the callback, if there is one.
            allDone = Promise.whenAll(loadedItems);
            if (callback) {
                allDone.then(callback);
            }
        }
        else {
            // Method 2: preload with text/cache hack.
            // This has to wait until the head is ready (supposedly).
            var queuedArgs = args;
            allDone = headReady.then(function () {
                var loadedItems = preLoadAssets(queuedArgs);

                // When all the items are loaded, run the callback, if there is one.
                var done = Promise.whenAll(loadedItems);
                if (callback) {
                    done.then(callback);
                }
                return done;
            });
        }

        return createApiPromise(allDone);
    };

    // INFO: for retro compatibility
    api.js = api.load;

    api.test = function (test, success, failure, callback) {
        ///<summary>
        /// INFO: use cases:
        ///    head.test(condition, null       , "file.NOk" , callback);
        ///    head.test(condition, "fileOk.js", null       , callback);        
        ///    head.test(condition, "fileOk.js", "file.NOk" , callback);
        ///    head.test(condition, "fileOk.js", ["file.NOk", "file.NOk"], callback);
        ///    head.test({
        ///               test    : condition,
        ///               success : [{ label1: "file1Ok.js"  }, { label2: "file2Ok.js" }],
        ///               failure : [{ label1: "file1NOk.js" }, { label2: "file2NOk.js" }],
        ///               callback: callback
        ///    );  
        ///    head.test({
        ///               test    : condition,
        ///               success : ["file1Ok.js" , "file2Ok.js"],
        ///               failure : ["file1NOk.js", "file2NOk.js"],
        ///               callback: callback
        ///    );         
        ///</summary>    
        var obj = (typeof test === 'object') ? test : {
            test: test,
            success: !!success ? isArray(success) ? success : [success] : false,
            failure: !!failure ? isArray(failure) ? failure : [failure] : false,
            callback: callback || noop
        };

        // Test Passed ?
        var passed = !!obj.test;

        // Do we have a success case
        if (passed && !!obj.success) {
            obj.success.push(obj.callback);
            api.load.apply(null, obj.success);
        }
            // Do we have a fail case
        else if (!passed && !!obj.failure) {
            obj.failure.push(obj.callback);
            api.load.apply(null, obj.failure);
        }
        else {
            callback();
        }

        return api;
    };

    api.ready = function (key, callback) {
        ///<summary>
        /// INFO: use cases:
        ///    head.ready(callBack)
        ///    head.ready(document , callBack)
        ///    head.ready("file.js", callBack);
        ///    head.ready("label"  , callBack);        
        ///</summary>

        // DOM ready check: head.ready(document, function() { });
        if (key === doc) {
            // Add the callback as a continuation of DOM readiness.
            domReady.then(callback);

            return createApiPromise(domReady);
        }

        // shift arguments
        if (isFunction(key)) {
            callback = key;
            key = "ALL";
        }

        // make sure arguments are sane
        if (typeof key !== 'string' || !isFunction(callback)) {
            return api;
        }

        // This can also be called when we trigger events based on filenames & labels
        var asset = assets[key];

        // If the key is "All", run the callback when everything is loaded.
        if (key === 'ALL') {

            // When the DOM is ready, look for any pending assets.
            var r = domReady.then(function () {

                // Build the array of pending assets.
                var pending = [];
                for (var asset in assets) {
                    if (asset.state < Asset.States.LOADED) {
                        pending.push(asset);
                    }
                }

                // When they're all complete, run the callback.
                var allReady = Promise.whenAll(pending);
                allReady.then(callback);
                return allReady;
            });

            return createApiPromise(r);
        }
        else if (asset) {

            // This referenced a specific asset, so run th callback when it's loaded.
            asset.then(callback);
            return createApiPromise(asset);
        }

        // This is a name for an asset we haven't yet defined, so we create an asset with this name, associating the callback.
        // The idea is that the sources will be defined later.
        var placeholder = new Asset(key, []);
        placeholder.then(callback);

        // Add the placeholder to the assets list.
        assets[placeholder.name] = placeholder;

        return createApiPromise(placeholder);
    };
    api.when = function (keys) {

        if (isArray(keys)) {

            // Iterate through all the keys, obtaining the Promise for each and storing it in a list.
            var assets = [];
            each(keys, function (k) {
                var a = api.ready(k);
                if (!!a.then) {
                    assets.push(a);
                }
            });

            // Return the Promise that's fulfilled when all the assets have loaded.
            return Promise.whenAll(assets);
        }
        else {

            // It's not an array, so we assume it's a single value
            return api.ready(keys);
        }
    };

    // perform this when DOM is ready
    api.ready(doc, function () {

        if (api.feature) {
            api.feature("domloaded", true);
        }
    });

    //#endregion

    //#region General Utilities

    /* private functions
    *********************/
    function noop() {
        // does nothing
    }

    function each(arr, callback) {
        if (!arr) {
            return;
        }

        // arguments special type
        if (typeof arr === 'object') {
            arr = [].slice.call(arr);
        }

        // do the job
        for (var i = 0, l = arr.length; i < l; i++) {
            callback.call(arr, arr[i], i);
        }
    }

    /* A must read: http://bonsaiden.github.com/JavaScript-Garden
     ************************************************************/
    function is(type, obj) {
        var clas = Object.prototype.toString.call(obj).slice(8, -1);
        return obj !== undefined && obj !== null && clas === type;
    }

    function isFunction(item) {
        return is("Function", item);
    }

    function isArray(item) {
        return is("Array", item);
    }

    //#endregion

    //#region Asset Utilities

    function toLabel(url) {
        ///<summary>Converts a url to a file label</summary>
        var items = url.split("/"),
             name = items[items.length - 1],
             i = name.indexOf("?");

        return i !== -1 ? name.substring(0, i) : name;
    }

    function getAsset(item) {
        ///<summary>
        /// Parses a generic item into an Asset, adding it to the global collection if it is new or returning an existing item if a match exists.
        ///</summary>
        /// <returns type="Object">The asset represented by the item.</returns>
        var asset;

        if (typeof item === 'object') {
            for (var label in item) {
                if (!!item[label]) {
                    asset = new Asset(label, isArray(item[label]) ? item[label] : [item[label]]);
                }
            }
        }
        else {
            var sources = isArray(item) ? item : [item];
            asset = new Asset(toLabel(sources[0]), sources);
        }

        // Check for an existing asset, starting by name.
        /// <var typr="Asset">An existing asset, if any.</var>
        var existing = assets[asset.name];
        if (existing) {

            // There's a name match.
            // If the existing entry has no sources, use the new asset sources.
            // The theory is that the existing entry is a placeholder and this new asset fills-in the sources.
            if (existing.sources.length === 0) {
                existing.sources = asset.sources;
                existing.loadTest = asset.loadTest;
            }

            // Return the existing Asset.
            return existing;
        }

        // Check for a match by comparing sources.
        each(assets, function (existingAsset) {
            each(asset.sources, function (source) {
                existing = assets[existingAsset];
                if (existing.sources.indexOf(source) > -1) {

                    // We found an existing asset for the same resource, but the name is different.
                    // Add this new asset to the collection, but leverage the existing entry such that this asset resolves when the existing one does.
                    // Share the deferred of the 
                    asset.deferred = existing.deferred;
                    asset.state = existing.state;
                    asset.then = existing.then;

                    // Create a method to synchronize the final state of this asset when the other completes, applying it.
                    var syncState = function () {
                        asset.state = existing.state;
                    };
                    asset.then(syncState, syncState);

                    // Store and return the new asset.
                    assets[asset.name] = asset;
                    return asset;
                }
            });
        });

        // This is a new asset, so add it and return it.
        assets[asset.name] = asset;
        return asset;
    }

    //#endregion

    //#region API Utilities

    function createApiPromise(promise) {
        /// <summary>
        /// Creates a new instance of an object that represents the current API and a specified Promise.
        /// This allows the API to support chaining and to act as a Promise.
        /// </summary>
        /// <param name="promise" type="Promise">A Promise to merge with the API object.</param>
        /// <returns type="Object">a new instance of an object that represents the current API and a specified Promise.</returns>
        return {
            load: api.load,
            js: api.js,
            test: api.js,
            ready: api.ready,
            when: api.when,
            then: promise.then
        };
    }

    //#endregion

})(window);
