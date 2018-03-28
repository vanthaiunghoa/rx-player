import objectAssign from "object-assign";
import { Subject } from "rxjs/Subject";
import { Observable } from "rxjs/Observable";
import "rxjs/add/operator/combineLatest";
import "rxjs/add/operator/distinctUntilChanged";
import "rxjs/add/operator/pluck";
import "rxjs/add/operator/takeUntil";

/**
 * Homemade state management architecture.
 *
 * Main differences with other state management library (like Redux):
 *
 *   - The state is not global.
 *     We have here multiple modules and each has its own state (we can even
 *     create multiple times the same module - for example multiple Todo lists
 *     - and each will have its own state).
 *
 *   - Modules have a lifecycle in that they "live" and "die" during the runtime
 *     of the application.
 *     This can be useful with memory management for complex and heavy
 *     applications.
 *
 *   - We are not opiniated with the way you should write your code (no action
 *     creators, no reducers - even if they are good practices).
 *     You should know what you do and not rely on any magic, just JavaScript.
 *
 *   - Asynchronous state updates which do not depends on actions are completely
 *     idiomatic (kept to a single function per module)
 *
 *   - Each action (Module's functions which might impact its state and perform
 *     side-effects like AJAX requests - kind of like Redux's action creators)
 *     can return a result. Mostly to keep track of your actions' consequences.
 *
 * --
 *
 * The function declared here creates a new module (defined in the modules
 * directory) and give it the payload in argument.
 *
 * The module can send state updates at any time, through its state Object,
 * and returns an Object containing functions: the actions.
 *
 * The actions can then be called through the dispatch function returned here.
 *
 * As an example is simpler for everyone:
 * @example
 * ```js
 * // 1 - We create the Module definition
 *
 * const TodoList = ({ maxTodoItems }) => {
 *   // we initialize a private state
 *   let lastTodoId = 0;
 *
 *   // We return the Module's actions:
 *   return {
 *     // Basic state
 *     __INITIAL_STATE__: {
 *       todos: [],
 *     },
 *
 *     // Add a todo if max length is not yet reached
 *     // @param {Object} state
 *     // @param {string} text
 *     // @returns {Object} Object with 2 properties:
 *     //   - state {Object}: the state update
 *     //   - result {number}: The created Todo ID. -1 when no Todo item was
 *     //     created.
 *     ADD_TODO: function(state, text) {
 *       const currentTodos = state.todos;
 *       if (currentTodos.length >= maxTodoItems) {
 *         return -1;
 *       }
 *
 *       const id = lastTodoId++;
 *
 *       // update state and return id as a result
 *       return {
 *         // state update
 *         state: {
 *           todos: [
 *             ...currentTodos,
 *             { id, text },
 *           ],
 *         },
 *
 *         // return result
 *         result: id,
 *       };
 *     },
 *
 *     // remove a todo thanks to its id
 *     // @param {Object} state
 *     // @param {number} todoID
 *     // @returns {boolean} True if the Todo has been found and removed. false
 *     // otherwise
 *     // @returns {Object} Object with 2 properties:
 *     //   - state {Object}: the state update
 *     //   - result {boolean}: True if the Todo has been found and removed.
 *     //     false otherwise
 *     REMOVE_TODO: function(state, todoID) {
 *       const currentTodos = state.todos;
 *
 *       const index = currentTodos
 *         .findIndex(({ id }) => id === todoID);
 *
 *        if (index < 0) {
 *          // this can help the caller to realize that the todo did not exist
 *          return {
 *            result: false,
 *          };
 *        }
 *
 *        // Remove from the Array
 *        // (cleaner to clone to avoid impacting the old reference)
 *        todosClone.slice().splice(index, 1);
 *
 *       return {
 *         // state update
 *         state: { todos: todosClone },
 *
 *         // return result
 *         result: true,
 *       };
 *     },
 *   };
 * };
 *
 * // 2 - Create a new TodoList Module
 * const todoList = createModule(TodoList, { maxTodoItems: 2 });
 *
 * // display the current todos
 * console.log(todoList.get("todos")); // []
 *
 * // display todos when they change
 * todoList.get$("todos")
 *   .subscribe(todos => {
 *     console.log(todos);
 *   });
 *
 * // Call an action of the module and save the ID of it
 * const firstId = todoList.dispatch("ADD_TODO", "do something");
 *
 * // Result:
 * console.log(todoList.get("todos"));
 * // [{ text: "do something", id: 0 }]
 *
 * todoList.dispatch("ADD_TODO", "do another thing");
 *
 * console.log(todoList.get("todos"));
 * // [{ text: "do something", id: 0 }, { text: "do another thing", id: 2 }]
 *
 * todoList.dispatch("ADD_TODO", "yet another");
 *
 * console.log(todoList.get("todos"));
 * // still the same, as we reached the max length set (maxTodoItems === 2):
 * // [{ text: "do something", id: 0 }, { text: "do another thing", id: 2 }]
 *
 * // remove the first todo created
 * const wasRemoved = todoList.dispatch("REMOVE_TODO", firstId);
 *
 * console.log(todoList.get("todos"));
 * // [{{ text: "do another thing", id: 2 }]
 *
 * console.log(wasRemoved);
 * // true
 *
 * todoList.destroy(); // cleanup and stop get$ subscriptions
 * ```
 *
 * @param {Function} module
 * @param {*} payload
 * @returns {Object} - Object with the following functions:
 *
 *   - dispatch: call an action from the module. Takes the name of the action
 *     (a string) + an eventual payload in argument.
 *     Returns a potential return value if the action provides one.
 *
 *   - get: get the entire module state, or the property named after the
 *     argument (a string).
 *
 *   - get$: same as get, but returns an observable instead. Start emitting at
 *     the first change
 *
 *   - destroy: destroy the module. Completes all subscriptions.
 */
function createModule(module, payload) {
  if (typeof module !== "function") {
    throw new Error("A module should be a function");
  }

  // TODO Implement own listener
  const destroy$ = new Subject();
  const updates$ = new Subject()
    .takeUntil(destroy$);

  const moduleObject = module(payload);
  if (!moduleObject) {
    throw new Error("A module should return an Object");
  }

  const moduleState = moduleObject.__INITIAL_STATE__ != null ?
    moduleObject.__INITIAL_STATE__ : {};

  function getState(...args) {
    if (!args.length) {
      return moduleState;
    }
    if (args.length === 1) {
      return moduleState[args[0]];
    }
    return args.map(arg => moduleState[arg]);
  }

  function updateState(newState) {
    objectAssign(moduleState, newState);
    updates$.next(moduleState);
  }

  function getState$(...args) {
    if (!args.length) {
      return updates$;
    }

    if (args.length === 1) {
      return updates$
        .pluck(args)
        .distinctUntilChanged();
    }

    const observables = args.map(arg =>
      updates$
        .pluck(arg)
        .distinctUntilChanged()
    );

    return Observable
      .combineLatest(...observables);
  }

  if (moduleObject.__ASYNC__ != null) {
    moduleObject.__ASYNC__(getState, updateState);
  }

  return {
    dispatch: (actionName, payload) => {
      if (!moduleObject || typeof moduleObject[actionName] !== "function") {
        throw new Error(
          `The ${actionName} action does not exist on this module.`
        );
      }
      const returnValue = moduleObject[actionName](moduleState, payload);
      if (returnValue == null) {
        return;
      }
      const {
        state,
        result,
      } = returnValue;

      if (state != null) {
        updateState(state);
      }

      return result;
    },

    get: getState,
    get$: getState$,
    destroy: () => {
      if (moduleObject.__DISPOSE__ != null) {
        moduleObject.__DISPOSE__();
      }
      destroy$.next();
      destroy$.complete();
    },
  };
}

export {
  createModule,
};
