import cytoscape from "cytoscape";
import cola from "cytoscape-cola";
import dagre from "cytoscape-dagre";

import BubbleSets from "cytoscape-bubblesets";
import contextMenus from 'cytoscape-context-menus';
import 'cytoscape-context-menus/cytoscape-context-menus.css';

import graphTasks from './graphtasks';

import './style.css';
import cystyle from './cy.cyss';

// Register extensions
cytoscape.use(cola);
cytoscape.use(dagre);
cytoscape.use(BubbleSets);
cytoscape.use(contextMenus);

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

const bb = cy.bubbleSets();

let colaLayout;

// Set up context menus
const menus = cy.contextMenus({menuItems: [
  {
    id: 'lock',
    content: 'Lock node',
    selector: 'node:unlocked',
    onClickFunction: (e) => {
      e.target.lock();
    }
  },
  {
    id: 'unlock',
    content: 'Unlock node',
    selector: 'node:locked',
    onClickFunction: (e) => {
      e.target.unlock();
    }
  },
  {
    id: 'remove',
    content: 'Remove node',
    selector: 'node',
    onClickFunction: (e) => {
      e.target.remove();
    }
  },
  {
    id: 'fit',
    content: 'Fit',
    selector: 'node, edge',
    coreAsWell: true,
    onClickFunction: () => {
      cy.fit();
    }
  },
  {
    id: 'info',
    content: 'Log info',
    selector: 'node, edge',
    onClickFunction: (e) => {
      console.log(e.target.data());
    }
  },
  {
    id: 'subset',
    content: 'Subset from this node',
    selector: 'node',
    onClickFunction: (e) => {
      console.log('subsetting');
      tasks.workWithSubset(e.target)();
    }
  },
  {
    id: 'unsubset',
    content: 'Restore all nodes',
    selector: 'node, edge',
    coreAsWell: true,
    onClickFunction: () => {
      cy.json(originalJson);
    }
  },
  {
    id: 'selectMenu',
    content: 'Select...',
    selector: 'node, edge',
    submenu: [
      {
        id: 'selectAll',
        content: 'Select all',
        selector: 'node, edge',
        onClickFunction: () => {
          cy.elements().select();
        }
      },
      {
        id: 'selectNeighborhood',
        content: 'Select neighborhood',
        selector: 'node, edge',
        onClickFunction: (e) => {
          e.target.neighborhood().select();
        }
      },
      {
        id: 'selectEnds',
        content: 'Select connected nodes',
        selector: 'edge',
        onClickFunction: (e) => {
          e.target.connectedNodes().select();
        }
      },
      {
        id: 'selectOutgoers',
        content: 'Select outgoers',
        onClickFunction: (e) => {
          let rubrowserOutgoers = e.target.outgoers('edge[originTools.0="rubrowser"]');
          rubrowserOutgoers = rubrowserOutgoers.union(rubrowserOutgoers.targets());
          rubrowserOutgoers.select();
        }
      },
      {
        id: 'selectDescendants',
        content: 'Select descendants',
        onClickFunction: (e) => {
          let n = 0;
          let coll = cy.collection().union(e.target)
          while (coll.length > n) {
            n = coll.length;
            coll = coll.union(coll.outgoers('edge[originTools.0="rubrowser"]'));
            coll = coll.union(coll.targets());
          }
          coll.select();
        }
      }
    ]
  },
  {
    id: 'withSelectionMenu',
    content: 'With Selection...',
    selector: 'node:selected, edge:selected',
    submenu: [
      {
        id: 'lockSelected',
        content: 'Lock all nodes',
        onClickFunction: () => {
          cy.elements(':selected').lock();
        }
      },
      {
        id: 'gridHere',
        content: 'Grid layout here',
        onClickFunction: () => {
          cy.elements(':selected').layout({
            name: 'grid',
          }).start();
        }
      },
      {
        id: 'bfsHere',
        content: 'BFS layout here',
        onClickFunction: (e) => {
          cy.elements(':selected').layout({
            name: 'breadthfirst',
            directed: true,
            maximal: true,
            roots: e.target 
          }).start();
        }
      },
      {
        id: 'dagreHere',
        content: 'Dagre layout here',
        onClickFunction: (e) => {
          const selectedElements = cy.elements('node:selected');
          const internalEdges = selectedElements.edgesWith(selectedElements).edges('[originTools.0="rubrowser"][!circular]');
          let selection = selectedElements.union(internalEdges);

          // If there are multiple roots, attempt to link them in.
          let components = selection.components();
          while (components.length > 1) {
            console.log(`Reducing ${components.length} components`);
            const smallestComponent = components.reduce((min, c) => {
              if (min == null || c.length < min.length) {
                return c;
              }
              return min;
            });
            const rest = selectedElements.subtract(smallestComponent);
            selection = selection.union(rest.edgesTo(smallestComponent).edges('[originTools.0="rubrowser"]'));
            components = selection.components();
          }

          selection.layout({
            name: 'dagre',
            rankDir: 'TB',
          }).start();
        }
      },
      {
        id: 'bfsTest',
        content: 'Test BFS subsetting',
        onClickFunction: (e) => {
          const selected = cy.elements('node:selected, edge:selected[!circular]');
          cy.elements().unselect();
          selected.select();
        }
      }
    ]
  },
  {
    id: 'startCola',
    content: 'Start COLA layout',
    coreAsWell: true,
    onClickFunction: () => {
      console.log("starting interactive COLA");
      colaLayout = cy.layout({
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
            return 5;
          }
          // console.log('default');
          return 5;
        },
      });

      colaLayout.on('layoutstop', () => {
        console.log("Interactive COLA stopped");
      })

      colaLayout.run();
    }
  },
  {
    id: 'stopCola',
    content: 'Stop COLA layout',
    coreAsWell: true,
    onClickFunction: () => {
      colaLayout?.stop();
    }
  },
  {
    id: 'kscut',
    content: 'Find cut',
    selector: 'node',
    onClickFunction: (e) => {
      const node = e.target;
      const bb = cy.bubbleSets();

      console.log('Finding a cut group');
      const connectedSubgraph = node.component();
      console.log(connectedSubgraph);
      const {cut, components} = connectedSubgraph.kargerStein();
      console.log(cut, components);
      const pathGroup = cut.connectedNodes().union(cut);
      console.log(pathGroup);
      // pathGroup = pathGroup.union(pathGroup.neighborhood());
      bb.addPath(pathGroup.nodes(), pathGroup.edges(), null)
    }
  },
  {
    id: 'markov',
    content: 'Find markov clusters',
    selector: 'node',
    onClickFunction: (e) => {
      const node = e.target;

      console.log('Finding markov clusters of component');
      const component = node.component()
      console.log(component)
      
      const clusters = component.filter('[^siblingBond]').markovClustering();
      console.log(clusters);

      for (let cluster of clusters) {
        cluster = cluster.union(cluster.edgesWith(cluster));
        bb.addPath(cluster.nodes(), cluster.edges(), null)
      }      
    }
  },
  {
    id: 'unbubble',
    content: 'Clear bubble clusters',
    coreAsWell: true,
    onClickFunction: () => {
      for (const path of bb.getPaths()) {
        bb.removePath(path);
      }
    }
  }
]})

let originalJson = {};

// fetch('/rails-redacted.cy.json')
fetch('/rails.cy.json')
  .then(response => response.json())
  .then(tasks.addBreaksToNames)
  .then(response => cy.json(response))
  // .then(tasks.createVirtualParentNodes)
  // .then(tasks.applySiblingBond)
  .then(tasks.unparentAll)
  .then(tasks.doLayout({name: 'grid'}))
  .then(() => {
    originalJson = cy.json();
  })
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