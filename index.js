const cy = cytoscape({
    container: document.getElementById('cy'),
});

fetch('/cy.css')
  .then(response => response.text())
  .then(response => cy.style(response));

const workWithSubset = () => {
  let local = cy.collection();
  local = local.union(cy.nodes('[id="423"]')); // FutureHubrisVehicle
  local = local.union(local.children());
  local = local.union(local.connectedEdges().connectedNodes());
  local = local.union(local.nonorphans().parents());
  local = local.union(local.orphans().children());
  
  let rest = cy.nodes().not(local);
  cy.remove(rest);
}

const doLayout = (opts = {name: 'cola'}) => () => {
  console.log(`Running layout: ${opts.name}`);
  const layout = cy.layout(opts);
  const p = layout.promiseOn('layoutstop');
  layout.run();
  return p;
}

const createVirtualParentNodes = () => {
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
}

const applySiblingBond = () => {
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
}

fetch('/rails-redacted.cy.json')
  .then(response => response.json())
  // .then(json => {
  //   console.log(json);
  //   return json;
  // })
  .then(json => {
    return {
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
    }
    // json.elements.nodes.forEach(node => {
    //   node.data.name.replace(/([a-z:])([A-Z])/g, '$1 $2');
    // });
    // return json;
  })
  // .then(json => {
  //   console.log(json);
  //   return json;
  // })
  .then(response => cy.json(response))
  // .then(workWithSubset)
  // .then(doLayout({
  //   name: 'circle'
  // }))
  // 

  // This block unparents all children
  // .then(() => {
  //   cy.nodes().children().forEach(node => {
  //     node.move({parent: null});
  //   })
  // })

  // .then(() => {
  //   let max = 0;
  //   cy.edges('[lines]').forEach(edge => {
  //     max = Math.max(max, edge.data('lines').length);
  //   });
  //   console.log("max", max);
  // })

  .then(createVirtualParentNodes)
  .then(applySiblingBond)
  
  .then(() => {
    cy.edges('[originTools.0="rubrowser"]').data('colaOverrides', {weight: 0.0001});
    // cy.edges('[siblingBond]').data('colaOverrides', {weight: 0});
  })

  .then(() => {
    console.log("starting interactive COLA");
    const layout = cy.layout({
      name: 'cola',
      randomize: false,
      fit: false,
      nodeDimensionsIncludeLabels: true,
      unconstrIter: 10, // 100,
      userConstIter: 0,
      // allConstIter:
      infinite: true,
      edgeLength: edge => {
        if (edge.data('siblingBond')) {
          // console.log('sibling bond');
          return 1;
        }
        if (edge.data('originTools')[0] === 'rubrowser') {
          return 50;
          // We're going to make these basically unweighted.
        }
        // console.log('default');
        return 5;
      },
    });
    layout.run();

    layout.on('layoutready', () => {
      console.log("layout ready");
      cy.fit();
    })

    layout.on('layoutstop', () => {
      console.log("layout stopped");
    })

    // cy.on('dragfree', (event) => {
    //   // console.log(event.target);
    //   // event.target.lock();
    //   // layout.run();
    // });
  })
  // .then(() => {
  //   console.log("in the groups");
  //   const promises = [];
  //   cy.nodes().orphans().forEach(node => {
  //     let collection = node.descendants();
  //     collection = collection.union(collection.connectedEdges());
  //     const layout = collection.layout({
  //       name: 'cola',
  //     });
  //     const p = layout.promiseOn('layoutstop');
  //     layout.run();
  //     promises.push(p);
  //   });
  //   return Promise.all(promises);
  // })
  // .then(() =>{
  //   console.log("in the aggregate");
  //   let collection = cy.nodes().orphans();
  //   collection = collection.union(collection.connectedEdges());
  //   console.log(`laying out ${collection.nodes().map(n => n.data('name')).join(', ')}`);
  //   const layout = collection.layout({
  //     name: 'random',
  //   });
  //   const p = layout.promiseOn('layoutstop');
  //   layout.run();
  // })
  // .then(doLayout({
  //   name: 'cola',
  //   maxSimulationTime: 5000,
  // }))

  // .then(() => {  
  //   // Layout ignoring call edges
  //   let collection = cy.collection()
  //   collection = collection.union(cy.nodes());
  //   collection = collection.union(cy.edges('[originTools.0!="rubrowser"]'));
  //   collection.layout({
  //     name: 'cola',
  //     maxSimulationTime: 10000,
  //   }).run();
  // })