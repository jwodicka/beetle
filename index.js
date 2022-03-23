import cytoscape from "cytoscape";
import cola from "cytoscape-cola";
import dagre from "cytoscape-dagre";
import cise from "cytoscape-cise";
import layoutUtilities from 'cytoscape-layout-utilities';


import graphTasks from './graphtasks';
import registerMenus from "./menus";

import './style.css';
import cystyle from './cy.cyss';

// Register extensions
cytoscape.use(layoutUtilities);
cytoscape.use(cola);
cytoscape.use(dagre);
cytoscape.use(cise);

// Create the Cytoscape-managed div.
const container = document.createElement('div');
container.id = 'cy';
document.body.appendChild(container);

// Attach cytoscape
const cy = cytoscape({container});
// Add our styles
cy.style(cystyle);

// Load the tasks file attached to the graph
const tasks = graphTasks(cy);

// Set up context menus
const menus = registerMenus(cy);

let originalJson = {};

// fetch('/rails-redacted.cy.json')
fetch('/rails.cy.json')
  .then(response => response.json())
  .then(tasks.addBreaksToNames)
  .then(response => cy.json(response))
  .then(() => {
    // Remove any elements that are in the patches directory.
    // These are monkey-patches of underlying classes, and we probably do not want to consider them.
    console.log(cy.nodes('[locations.0.file *= "lib/patches/"]').remove().nodes());
  })
  .then(() => {
    // Can we add in Pundit's magical mystery policy links? Sure!
    cy.nodes('[type$="Model"]').each((modelNode) => {
      const modelNodeId = modelNode.id();
      const impliedPolicyNameId = `${modelNodeId}Policy`;
      if (cy.getElementById(impliedPolicyNameId).length > 0) {
        cy.add({data: {
          source: modelNodeId,
          target: impliedPolicyNameId,
          type: 'PunditPolicy',
        }})
      }
    })
  })
  .then(() => {
    // railroady's cardinality algorithm left something to be desired. Everything is an is-a or many:many...

    // For the many:many edges, if there's a parallel edge defined by ERD, discard railroady's edge and trust ERD.
    cy.edges('[rrType="many:many"]').each(edge => {
      if (edge.parallelEdges('[originTools.0="erd"]').length > 0) {
        edge.remove();
      }
    })
    cy.edges('[rrType="is-a"]').each(edge => {
      // For the is-a edges, ERD wants to represent them as one-to-many. Railroady is more sensible.
      edge.parallelEdges('[originTools.0="erd"]').remove();
    })
  })
  // .then(tasks.createVirtualParentNodes)
  // .then(tasks.applySiblingBond)
  .then(tasks.unparentAll)
  .then(tasks.doLayout({name: 'grid'}))
  .then(() => {
    originalJson = cy.json();
  })
  // .then(() => {
  //   cy.nodes().on('dblclick', (e) => {
  //     console.log(`double-clicked on ${e.target.id()}`);
  //     e.target.toggleClass('collapse');
  //   })
  // })
  // .then(() => {
  //   const degreeCounts = {};
  //   cy.nodes().forEach(node => {
  //     const degree = node.degree(false);
  //     if (!(degree in degreeCounts)) { degreeCounts[degree] = 0 }
  //     degreeCounts[degree]++;
  //     if (degree > 37) {
  //       console.log(node.id(), node.indegree(false), node.outdegree(false));
  //     }
  //   })
  //   console.log(degreeCounts);
  // })
  .then(() => {
    // Find all disconnected nodes and remove them for now.
    cy.remove('[[degree=0]]');

    // let done = false;
    // while (!done) {
    //   done = true;
    //   console.log('starting a pass')
    //   for (const leaf of cy.nodes().leaves()) {
    //     // console.log(leaf.data('name'));
    //     const fromNodes = leaf.incomers().nodes();
    //     // console.log(fromNodes);
    //     if (fromNodes.length == 1) {
    //       // Move the node under its only caller.
    //       console.log('moving', leaf.data('name'))
    //       leaf.move({parent: fromNodes[0].id()});
    //       console.log(leaf.data())

    //       // Alternatively: Delete nodes with only one caller.
    //       // console.log('removing', leaf.data('name'));
    //       // leaf.remove();
    //       done = false;
    //     }
    //   }
    // }

    // for (const node of cy.nodes()) {
    //   const incomers = node.incomers().nodes();
    //   const outgoers = node.outgoers().nodes();
    //   if (incomers.length == 1 && outgoers.length == 1) {
    //     if (incomers.union(outgoers).length == 1) {
    //       console.log('only one neighbor', node.data('name'));
    //       node.move({parent: incomers[0].id()});
    //     }
    //     console.log("through-node", node.data('name'));
    //   } else if (incomers.length == 1) {
    //     console.log("only one caller", node.data('name'));
    //     node.move({parent: incomers[0].id()});
    //   } else if (outgoers.length == 1) {
    //     console.log("only one target", node.data('name'));
    //     node.move({parent: outgoers[0].id()});
    //   }
    // }
  })
  // .then(() => {
  //   cy.remove(':child')
  // })
  // .then(tasks.createVirtualParentNodes)

  // .then(tasks.workWithSubset('#BillingEntry'))



  // .then(() => {
  //   const dag = cy.nodes().union(
  //     cy.edges('[originTools.0="rubrowser"][!circular]')
  //   );
  //   console.log(`dag: ${dag.nodes().length}, ${dag.edges().length}`);
  //   const layout = dag.layout({
  //     name: 'cola',
  //     flow: {
  //       axis: 'x',
  //       minSeparation: 30,
  //     },
  //     fit: false,
  //     edgeLength: 5,
  //     infinite: true,
  //   })
  //   const layout2 = cy.layout({
  //     name: 'cola',
  //     randomize: false,
  //     fit: false,
  //     edgeLength: 5,
  //     infinite: true,
  //   });

  //   layout.promiseOn('layoutready').then(() => {
  //     cy.fit();
  //     layout2.start();
  //   })
    
  //   layout.start();
  // })
  
  // .then(() => {
  //   cy.edges('[originTools.0="rubrowser"]').data('colaOverrides', {weight: 0.0001});
  //   // cy.edges('[siblingBond]').data('colaOverrides', {weight: 0});
  // })

  // .then(() => {
  //   console.log("starting interactive COLA");
  //   const layout = cy.layout({
  //     name: 'cola',
  //     randomize: false,
  //     fit: false,
  //     nodeDimensionsIncludeLabels: true,
  //     unconstrIter: 10, // 100,
  //     userConstIter: 0,
  //     // allConstIter:
  //     infinite: true,
  //     edgeLength: edge => {
  //       if (edge.data('siblingBond')) {
  //         // console.log('sibling bond');
  //         return 1;
  //       }
  //       if (edge.data('originTools')[0] === 'rubrowser') {
  //         return 50;
  //         // We're going to make these basically unweighted.
  //       }
  //       // console.log('default');
  //       return 5;
  //     },
  //   });
  //   layout.run();

  //   layout.on('layoutready', () => {
  //     console.log("layout ready");
  //     cy.fit();
  //   })

  //   layout.on('layoutstop', () => {
  //     console.log("layout stopped");
  //   })

  //   // cy.on('dragfree', (event) => {
  //   //   // console.log(event.target);
  //   //   // event.target.lock();
  //   //   // layout.run();
  //   // });
  // })
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