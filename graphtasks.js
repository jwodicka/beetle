const graphTasks = (cy) => ({
  // TODO: Take the heart of the subset as an argument.
  workWithSubset: () => {
    let local = cy.collection();
    local = local.union(cy.nodes('[id="423"]')); // FutureHubrisVehicle
    local = local.union(local.children());
    local = local.union(local.connectedEdges().connectedNodes());
    local = local.union(local.nonorphans().parents());
    local = local.union(local.orphans().children());
    
    let rest = cy.nodes().not(local);
    cy.remove(rest);
  },

  doLayout: (opts = {name: 'cola'}) => () => {
    console.log(`Running layout: ${opts.name}`);
    const layout = cy.layout(opts);
    const p = layout.promiseOn('layoutstop');
    layout.run();
    return p;
  },

  createVirtualParentNodes: () => {
    cy.nodes(':parent').forEach(parent => {
      cy.add({
        data: {
          id: `${parent.id()}_v`,
          parent: parent.id(),
          virtualParent: true,
        },
        group: 'nodes',
      });
      cy.edges(`[source="${parent.id()}"]`).move({source: `${parent.id()}_v`});
      cy.edges(`[target="${parent.id()}"]`).move({target: `${parent.id()}_v`});
    });
  },

  applySiblingBond: () => {
    cy.nodes().parents().forEach(parent => {
      let children = parent.children(':childless');
      children = children.union(
        parent.children(':parent').map(p => p.children(':childless')[0])
      );
      children.forEach(child => {
        const siblings = children.subtract(child);
        siblings.forEach(sibling => {
          cy.add({
            data: {
              source: child.id(),
              target: sibling.id(),
              siblingBond: true,
            }
          });
        });
      })
    })
  },

  logTap: data => {
    console.log(data);
    return data;
  },

  addBreaksToNames: json => ({
    ...json, 
      elements: {
        ...json.elements,
        nodes: json.elements.nodes.map(
          node => ({
            ...node,
            data: {
              ...node.data,
              name: node.data.name.replace(/([a-z:])([A-Z])/g, '$1\u200b$2'),
            }
          }))
      }
  }),

  unparentAll: () => {
    cy.nodes().children().forEach(node => {
      node.move({parent: null});
    })
  },

})


export default graphTasks;