import cytoscape from "cytoscape";
import cola from "cytoscape-cola";
import dagre from "cytoscape-dagre";
import cise from "cytoscape-cise";
import elk from 'cytoscape-elk';
import svg from 'cytoscape-svg';
import fcose from 'cytoscape-fcose';
import coseBilkent from 'cytoscape-cose-bilkent';
import expandCollapse from 'cytoscape-expand-collapse';

import layoutUtilities from 'cytoscape-layout-utilities';

import BubbleSets from "cytoscape-bubblesets";
import contextMenus from 'cytoscape-context-menus';
import 'cytoscape-context-menus/cytoscape-context-menus.css';

import graphTasks from './graphtasks';

import './style.css';
import cystyle from './cy.cyss';

// Register extensions
cytoscape.use( layoutUtilities );
cytoscape.use(svg);
cytoscape.use(cola);
cytoscape.use(dagre);
cytoscape.use(BubbleSets);
cytoscape.use(contextMenus);
cytoscape.use(cise);
cytoscape.use(elk);
cytoscape.use(fcose);
cytoscape.use(coseBilkent);
cytoscape.use(expandCollapse);

// Create the Cytoscape-managed div.
const container = document.createElement('div');
container.id = 'cy';
document.body.appendChild(container);

// Attach cytoscape
const cy = cytoscape({container});

// Give us a handle we can use on the console for programmatic access.
window.cy = cy;

// Add our styles
cy.style(cystyle);

// Load the tasks file attached to the graph
const tasks = graphTasks(cy);

const bb = cy.bubbleSets();

const xc = cy.expandCollapse({
  // layoutBy: {
  //   name: 'cose-bilkent',
  //   // nodeRepulsion: 45000,
  //   randomize: false,
  // },
  cueEnabled: true,
  undoable: false,
  expandCollapseCueSize: 24, 
});

let colaLayout;

let groups = [];
let domains = {};

const rebuildDomainSubmenu = () => {
  menus.removeMenuItem('addToDomainMenu');
  const domainSubmenu = [];
  for (const domain of Object.keys(domains).sort()) {
    domainSubmenu.push({
      id: `addTo${domain}`,
      content: domain,
      onClickFunction: (e) => {
        // If there is a selection, we'll add everything selected.
        // Otherwise, we'll add the target element.
        const selection = cy.nodes(':selected');
        const target = selection.length > 0 ? selection : e.target;
        target.move({parent: domains[domain].id()});
      }
    });
  }
  menus.appendMenuItem({
    id: 'addToDomainMenu',
    content: 'Add to domain...',
    selector: 'node',
    submenu: domainSubmenu,
  });
}

// Set up context menus
const menus = cy.contextMenus({menuItems: [
  {
    id: 'lock',
    content: 'Lock node',
    selector: 'node:unlocked',
    onClickFunction: (e) => {e.target.lock();}
  },
  {
    id: 'unlock',
    content: 'Unlock node',
    selector: 'node:locked',
    onClickFunction: (e) => {e.target.unlock();}
  },
  {
    id: 'collapse',
    content: 'Collapse / Uncollapse group',
    selector: 'node:parent',
    onClickFunction: (e) => {e.target.toggleClass('collapse')}
  },
  {
    id: 'remove',
    content: 'Remove node',
    selector: 'node',
    onClickFunction: (e) => {e.target.remove();}
  },
  {
    id: 'fit',
    content: 'Fit to all nodes',
    coreAsWell: true,
    onClickFunction: () => {cy.fit();}
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
        id: 'selectGroup',
        content: 'Select group',
        onClickFunction: (e) => {
          const group = e.target.data('group');
          console.log(group);
          cy.nodes(`[group="${group}"]`).select();
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
        id: 'selectNeighbors',
        content: 'Select non-parent neighbors',
        selector: 'node, edge',
        onClickFunction: (e) => {
          e.target.neighborhood('node').subtract(e.target.neighborhood('.cy-expand-collapse-collapsed-node')).select();
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
        id: 'hideRest',
        content: 'Hide unselected entities',
        onClickFunction: () => {
          cy.elements(':selected').absoluteComplement().toggleClass('hidden', true);
        }
      },
      {
        id: 'removeRest',
        content: 'Remove unselected entities',
        onClickFunction: () => {
          cy.elements(':selected').absoluteComplement().remove();
        }
      },
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
            let smallestRoots = smallestComponent.roots();
            if (smallestRoots.length < 1) {
              smallestRoots = smallestComponent;
            }
            const rest = selectedElements.subtract(smallestComponent);
            selection = selection.union(rest.edgesTo(smallestRoots).edges('[originTools.0="rubrowser"]'));
            components = selection.components();
          }

          selection.layout({
            name: 'dagre',
            rankDir: 'TB',
            acyclicer: 'greedy',
          }).start();
        }
      },
      {
        id: 'dagreAcyclicer',
        content: 'Dagre layout using Dagre acyclicer',
        onClickFunction: (e) => {
          cy.elements(':selected').layout({
            name: 'dagre',
            rankDir: 'TB',
            ranker: 'longest-path',
            acyclicer: 'greedy'
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
    id: 'markConstraints',
    content: 'Mark COLA constraints',
    coreAsWell: true,
    onClickFunction: () => {
      // All non-circular edges generate inequalities
      const nonCircularEdges = cy.edges('[!circular]');
      // Some edges that are not tagged as circular are still directly circular.
      // Remove those from the set.
      const reallyNonCircularEdges = nonCircularEdges.filter((edge) => 
        edge.parallelEdges().subtract(
          edge.codirectedEdges()
        ).length === 0
      );

      // All leaf nodes are safe to put below their parents
      const leafEdges = cy.nodes().leaves().incomers('edge');
      // console.log(leafEdges.map(e => `${e.source().id()} -> ${e.target().id()}`));
      
      const inequalityEdges = reallyNonCircularEdges.union(leafEdges);
      inequalityEdges.addClass('constraint');
      inequalityEdges.data('constraint', true);
    }
  },
  {
    id: 'makeConstraint',
    content: 'Make this edge a constraint',
    selector: 'edge[^constraint]',
    onClickFunction: (e) => {
      e.target.addClass('constraint');
      e.target.data('constraint', true);
    }
  },
  {
    id: 'clearConstraint',
    content: 'Remove this edge as a constraint',
    selector: 'edge[constraint]',
    onClickFunction: (e) => {
      e.target.removeClass('constraint');
      e.target.data('constraint', undefined);
    }
  },
  {
    id: 'startCola',
    content: 'Start COLA layout',
    coreAsWell: true,
    onClickFunction: () => {
      console.log("starting interactive COLA");
      const visibleGraph = cy.elements(':visible');

      const gapInequalities = [];
      
      cy.edges('.constraint').forEach((edge) => {
        const inequality = {axis: 'y', left: edge.source(), right: edge.target(), gap: 150};
        gapInequalities.push(inequality);
      });

      colaLayout = visibleGraph.layout({
        name: 'cola',
        randomize: false,
        fit: false,
        avoidOverlap: true,
        nodeDimensionsIncludeLabels: true,
        unconstrIter: 100, // 100,
        // userConstIter: 10,
        // allConstIter: 10,
        infinite: true,
        gapInequalities,
        edgeLength: edge => {
          if (edge.target().indegree() == 1) {
            return 10;
          }
          return 300;
        }
        // edgeLength: edge => {
        //   if (edge.data('siblingBond')) {
        //     // console.log('sibling bond');
        //     return 1;
        //   }
        //   if (edge.data('originTools')[0] === 'rubrowser') {
        //     return 5;
        //   }
        //   // console.log('default');
        //   return 5;
        // },

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
    coreAsWell: true,
    onClickFunction: () => {
      let currentComponents = cy.elements().components();
      let nextComponents = [];
      const allClusters = [];
      let inflateFactor = 2;
      while (currentComponents.length > 0 || nextComponents.length > 0) {
        if (currentComponents.length == 0) {
          currentComponents = nextComponents;
          nextComponents = [];
          inflateFactor += 0.1;
          console.log("Increased inflateFactor to", inflateFactor);
        }

        const component = currentComponents.shift();
        console.log("Working on component with size", component.nodes().length);
        if (component.nodes().length < 10 || inflateFactor > 10) {
          // It's small enough already!
          allClusters.push(component.nodes());
          continue;
        }
        console.log('Finding markov clusters');
      
        const clusters = component.filter('[^siblingBond]').markovClustering({
          attributes: [
            //edge => 1/edge.target().indegree(), // The fewer other edges target this, the stronger
            //edge => 1/edge.source().outdegree(), // The fewer other calls from this source, the stronger
            edge => Math.max(1/edge.target().indegree(), 1/edge.source().outdegree()),
            edge => (edge.data('originTools') || [])  [0] != 'rubrowser' ? 1 : 0.5, // Treat the explicit ERD links as stronger
            edge => { // Shared namespaces are a strong sign of relatedness.
              const sourceParts = edge.source().id().split('::');
              const targetParts = edge.target().id().split('::');
              for (let i = 0; i < Math.min(sourceParts.length, targetParts.length); i++) {
                if (sourceParts[i] != targetParts[i]) return i;
              }
              return Math.min(sourceParts.length, targetParts.length);
            },
            edge => edge.data('rrType') === 'is-a' ? 1 : 0.1, // If this is an "is-a" edge, that's quite strong.
          ],
          inflateFactor,
          maxIterations: 50,
        });

        console.log(clusters.map(c => c.nodes().length));

        for (const cluster of clusters) {
          if (cluster.nodes().length > 100) {
            console.log("Queuing cluster for further decomposition");
            nextComponents.push(cluster.union(cluster.edgesWith(cluster)));
          } else {
            allClusters.push(cluster);
          }
        }
      }

      console.log(allClusters);
      groups = allClusters;

      for(const group of groups) {
        const {ele: maxDegreeNode} = group.max(n => n.degree());
        const groupName = `Group|${maxDegreeNode.id()}`
        group.data('group', groupName);
        group.on('dblclick', () => {
          console.log(`double-clicked on ${groupName}`);
          group.select();
        })
      }
    }
  },
  {
    id: 'cise',
    content: 'Apply CISE layout',
    coreAsWell: true,
    onClickFunction: () => {
      const clusters = groups.map(cluster => cluster.map(n => n.id()));
      console.log(clusters);

      cy.layout({
        name: 'cise',
        clusters,
        idealInterClusterEdgeLengthCoefficient: 3.0,
        nodeRepulsion: 10000,
        packComponents: true,
        // allowNodesInsideCircle: true,
        // maxRatioOfNodesInsideCircle: 0.25,
      }).start();
    }
  },
  {
    id: 'elkBox',
    content: 'Apply box-packing layout',
    coreAsWell: true,
    onClickFunction: () => {
      const aspectRatio = (cy.width() * 1.0) / cy.height();
      console.log("aspect ratio is", aspectRatio);

      cy.layout({
        name: 'elk',
        fit: false,
        nodeDimensionsIncludeLabels: true,
        elk: {
          algorithm: 'box',
          packingMode: 'GROUP_DEC',
          'elk.aspectRatio': 1.0,
          'spacing.nodeNode': 30,
          interactive: true,
        }
      }).start();
    }
  },
  {
    id: 'elkAlt',
    content: 'Apply ELK layout',
    coreAsWell: true,
    onClickFunction: () => {
      cy.layout({
        name: 'elk',
        fit: false,
        nodeDimensionsIncludeLabels: true,
        elk: {
          algorithm: 'layered',
          'elk.aspectRatio': 1.4,
          interactive: false,
        }
      }).start();
    }
  },
  {
    id: 'bubbles',
    content: 'Apply bubbles to groups',
    coreAsWell: true,
    onClickFunction: () => {
      for (let cluster of groups) {
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
  },
  {
    id: 'gridDomain',
    content: 'Clean up domain',
    selector: 'node[type="Domain"]',
    onClickFunction: (e) => {
      const domainNode = e.target;
      console.log(`cleaning up ${domainNode.id()}`);
      const children = domainNode.children();
      const squareSize = Math.ceil(Math.sqrt(children.length));
      const nodeSize = children.reduce((acc, child) => Math.max(acc, child.outerWidth()), 0);
      // const nodeSize = 150; // This is the size from the CSS - we could query instead.

      const nodeGap = Math.ceil(nodeSize * 0.2);
      const sideSize = ((nodeSize + nodeGap) * squareSize ) - nodeGap;
      const w = sideSize, h = sideSize;
      const {x1, y1} = domainNode.boundingBox();
      console.log({nodeSize, x1, y1, w, h});
      children.layout({
        name: 'grid',
        boundingBox: {x1, y1, w, h},
        fit: false,
        animate: true,
      }).start();
    }
  },
  {
    id: 'logSvg',
    content: 'Dump graph to SVG',
    coreAsWell: true,
    onClickFunction: () => {
      console.log(cy.svg());
    }
  },
  {
    id: 'logDomains',
    content: 'Dump domain data to JSON',
    coreAsWell: true,
    onClickFunction: () => {
      const data = cy.nodes('[type="Domain"]')
        .map(parent => ({
          id: parent.id(),
          name: parent.data('name'),
          children: parent.children().map(child => child.id())
        }));
      console.log(JSON.stringify(data));
    }
  },
  {
    id: 'addToTeam',
    content: 'Add to team',
    selector: 'node:orphan',
    submenu: [
      {id: 'buyer', content: 'Buyer', onClickFunction: (e) => e.target.data('team', 'Buyer')},
      {id: 'candidate', content: 'Candidate', onClickFunction: (e) => e.target.data('team', 'Candidate')},
      {id: 'data', content: 'Data', onClickFunction: (e) => e.target.data('team', 'Data')},
      {id: 'hire', content: 'Hire', onClickFunction: (e) => e.target.data('team', 'Hire')},
      {id: 'ive', content: 'IVE', onClickFunction: (e) => e.target.data('team', 'IVE')},
      {id: 'platform', content: 'Platform', onClickFunction: (e) => e.target.data('team', 'Platform')},
    ]
  },
  {
    id: 'clearTeam',
    content: 'Remove team',
    selector: 'node[team]',
    onClickFunction: (e) => e.target.removeData('team')
  },
  {
    id: 'addDomain',
    content: 'Add domain',
    coreAsWell: true,
    onClickFunction: () => {
      const name = window.prompt("Name of domain");
      if (name && !(name in domains)) {
        domains[name] = cy.add({data: {
          name,
          id: `Domain|${name}`,
          type: 'Domain',
        }})[0];
        rebuildDomainSubmenu();
      }
    }
  },
  {
    id: 'addToDomainMenu',
    content: 'Add to domain...',
    selector: 'node',
    submenu: [],
  }
]})

let originalJson = {};

// fetch('/full-post-cola.cy.json')
// .then(response => response.json())
// .then(response => cy.json(response))

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
  .then(async () => {
    const domainJson = await(await fetch('./domains.json')).json();
    console.log(domainJson);
    for (const {id, name, children} of domainJson) {
      domains[name] = cy.add({data: {name, id, type: 'Domain'}})[0];
      for (const childId of children) {
        cy.getElementById(childId).move({parent: id});
      }
    }
    rebuildDomainSubmenu();
  })

  .then(() => {
    xc.collapseAll();
    xc.collapseAllEdges();
  })

  .then(tasks.doLayout({name: 'grid'}))
  // .then(tasks.doLayout({
  //   name: 'cose-bilkent',
  //   fit: true,
  //   quality: 'proof',
  //   interactive: true,
  // }))



  // .then(tasks.doLayout({
  //   name: 'elk',
  //   fit: true,
  //   nodeDimensionsIncludeLabels: true,
  //   elk: {
  //     algorithm: 'box',
  //     packingMode: 'GROUP_DEC',
  //     'elk.aspectRatio': 1.0,
  //     'spacing.nodeNode': 30,
  //     interactive: true,
  //   }
  // }))

  //.then(tasks.doLayout({name: 'grid'}))
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
  //.then(() => {
    // Find all disconnected nodes and remove them for now.
  //  cy.remove('[[degree=0]]');

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
  //})
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