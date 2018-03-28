function addToData(data, val, maxSize) {
  const clonedData = data.slice();

  if (clonedData.length >= maxSize) {
    clonedData.splice(0, (clonedData.length + 1) - maxSize);
  }

  clonedData.push({
    date: Date.now(),
    value: val,
  });
  return clonedData;
}

function removeFromData(data, number) {
  const clonedData = data.slice();
  clonedData.splice(0, number);
  return clonedData;
}

export default function DATA_STORE({
  maxSize = Infinity,
  initialData = [],
}) {
  return {
    __INITIAL_STATE__: {
      data: addToData([], initialData, maxSize),
    },

    ADD_DATA: (state, val) => {
      return {
        state: {
          data: addToData(state.data, val, maxSize),
        },
      };
    },

    REMOVE_DATA: (state, number = 1) => {
      return {
        state: removeFromData(state.data, number),
      };
    },

  };
}
