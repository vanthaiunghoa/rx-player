import React from "react";

/**
 * Higher Order component which link module(s) state to your component's prop.
 *
 * The module(s) concerned should be in your component's prop, named as you
 * wish.
 *
 * The state listened to and the corresponding prop passed to your component
 * is done when calling withModulesState.
 *
 * @example
 * ```js
 * import MyComponent from "./MyComponent.js";
 *
 * const MyEnhancedComponent = withModulesState({
 *   // take a module's property and link it to a component's property
 *   moduleA: {
 *     porpery_in_module_A: "resulting_prop_name",
 *   },
 *
 *   moduleB: {
 *     // Most of the time you might want to name them the same
 *     stateB1: "stateB1",
 *     stateB2: "stateB2",
 *   },
 * })(MyComponent);
 *
 * ReactDOM.render(
 *   <MyEnhancedComponent
 *     moduleA={myModuleA}
 *     moduleB={myModuleB}
 *     otherProp={otherValue}
 *   />,
 *   el
 * );
 *
 * // in *MyComponent*, the corresponding state will be available in
 * // this.props (example: this.props.stateA1Prop). Those will be binded to the
 * // module's state, so updates will be repercuted on your module.
 *
 * // Note that module can be removed and added to the MyEnhancedComponent props
 * // component without problems. State subscriptions will be unlinked/relinked.
 * ```
 * @param {Object} moduleState
 * @returns {Function}
 */
function withModulesState(modulesState) {
  /**
   * @param {Function} Comp - The initial component
   * returns {Function} The enhanced component
   */
  return (Comp) => {
    const wantedModules = Object.keys(modulesState);
    const modulesSubscriptions = {};
    return class extends React.Component {
      constructor(...args) {
        super(...args);
        this.state = {};

        wantedModules.forEach(moduleName => {
          const module = this.props[moduleName];
          if (!module) {
            return;
          }

          const stateDictionnary = modulesState[moduleName];
          const stateNames = Object.keys(stateDictionnary);
          stateNames.forEach((stateName) => {
            this.state[stateDictionnary[stateName]] = module.get(stateName);
          });
        });
      }

      componentDidMount() {
        wantedModules.forEach(moduleName => {
          if (!this.props[moduleName]) {
            return;
          }

          modulesSubscriptions[moduleName] = [];

          const stateDictionnary = modulesState[moduleName];
          const module = this.props[moduleName];
          const wantedProps = Object.keys(modulesState[moduleName]);
          wantedProps.forEach((state) => {
            const sub = module
              .get$(state)
              .subscribe(val => {
                this.setState({
                  [stateDictionnary[state]]: val,
                });
              });

            modulesSubscriptions[moduleName].push(sub);
          });
        });
      }

      componentDidUpdate() {
        wantedModules.forEach(moduleName => {
          const module = this.props[moduleName];
          if (!module) {
            if (modulesSubscriptions[moduleName]) {
              modulesSubscriptions[moduleName]
                .forEach(sub => sub.unsubscribe());
              delete modulesSubscriptions[moduleName];
            }
            return;
          }

          if (!modulesSubscriptions[moduleName]) {
            modulesSubscriptions[moduleName] = [];
            const stateDictionnary = modulesState[moduleName];
            const wantedProps = Object.keys(modulesState[moduleName]);
            wantedProps.forEach((state) => {
              this.setState({
                [stateDictionnary[state]]: module.get(state),
              });
              const sub = module
                .get$(state)
                .subscribe(val => {
                  this.setState({
                    [stateDictionnary[state]]: val,
                  });
                });

              modulesSubscriptions[moduleName].push(sub);
            });
          }
        });
      }

      componentWillUnmount() {
        Object.keys(modulesSubscriptions).forEach(moduleName => {
          modulesSubscriptions[moduleName]
            .forEach(sub => sub.unsubscribe());
          delete modulesSubscriptions[moduleName];
        });
      }

      render() {
        const newProps = Object.assign({}, this.props, this.state);
        return <Comp {...newProps} />;
      }
    };
  };
}

export default withModulesState;
