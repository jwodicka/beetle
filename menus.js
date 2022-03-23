import cytoscape from "cytoscape";

import contextMenus from 'cytoscape-context-menus';
import 'cytoscape-context-menus/cytoscape-context-menus.css';

import bubbleSets from 'cytoscape-bubblesets';

cytoscape.use(contextMenus);
cytoscape.use(bubbleSets);

const coreAsWell = true; // We never set this to anything else, so alias it here.

// State variables. Messy!
let colaLayout;
let groups = [];

const rubrowserEdges = 'edge[originTools.0="rubrowser"]';

const cy = e => e.target.cy(); 
const target = e => e.target;
const selected = e => e.target.cy().elements(':selected');
const unselected = e => selected(e).absoluteComplement();

const groupNameOf = e => e.target.data('group');

const allElements = e => cy(e).elements();

const groupOf = e => cy(e).nodes(`[group="${groupNameOf(e)}"]`);
const neighborhoodOf = e => e.target.neighborhood();
const connectedNodesOf = e => e.target.connectedNodes();
const outgoersOf = e => e.target.outgoers();
const successorsOf = e => e.target.successors();
const filteredOutgoersOf = selector => e => e.target.outgoers(selector);
const filteredSuccessorsOf = selector => e => {
  const cy = cy(e);
  // Iterate, filtering edges, until no new nodes are added.
  let n = 0;
  let c = cy.collection().union(e.target)
  while (c.length > n) {
    n = c.length;
    c = c.union(c.outgoers(selector));
    c = c.union(c.targets());
  }
  return coll;
}

const withTargets = (fn) => e => {
  const edges = fn(e);
  return edges.union(edges.targets())
}

const select = (fn) => (e) => fn(e).select();
const lock = (fn) => e => fn(e).lock();
const unlock = (fn) => e => fn(e).unlock();
const remove = (fn) => e => fn(e).remove();
const fitTo = (fn) => e => fn(e).fit();

const doSyncLayout = (collection, opts) => {
  console.log("laying out via", opts.name);
  console.log(collection);
  const layout = collection.layout(opts);
  layout.start();
  return layout;
}
const doAsyncLayout = (collection, opts) => {
  const layout = collection.layout(opts);
  setTimeout(() => layout.start());
  return layout;
}

const layoutFor = (fn, prefix) => ({
  id: `${prefix}Layout`,
  content: 'Layout...',
  submenu: [
    {id: `${prefix}LayoutGrid`, content: 'Grid', onClickFunction: (e) => doSyncLayout(
      fn(e), {
        name: 'grid',
      })
    },
    {id: `${prefix}LayoutBFS`, content: 'BFS', onClickFunction: (e) => doSyncLayout(
      fn(e), {
        name: 'breadthfirst',
        directed: true,
      })
    },
  ]
})

const selectSubmenuItems = [
  {id: 'selectAll', content: 'all', onClickFunction: select(allElements)},
  {id: 'selectGroup', content: 'group', onClickFunction: select(groupOf)},
  {id: 'selectNeighborhood', content: 'neighborhood', onClickFunction: select(neighborhoodOf)},
  {id: 'selectConnected', content: 'connected nodes', onClickFunction: select(connectedNodesOf)},
  {id: 'selectOutgoers', content: 'outgoers', onClickFunction: select(outgoersOf)},
  {id: 'selectSuccessors', content: 'successors', onClickFunction: select(successorsOf)},
  {id: 'selectRubrowserOutgoers', content: 'direct callees', 
    onClickFunction: select(withTargets(filteredOutgoersOf(rubrowserEdges)))},
  {id: 'selectRubrowserSuccessors', content: 'all callees',
    onClickFunction: select(filteredSuccessorsOf(rubrowserEdges))}
];
const selectMenu = {
  id: 'selectMenu',
  content: 'Select...',
  selector: 'node, edge',
  submenu: selectSubmenuItems,
};

const withSelectionSubmenuItems = [
  {id: 'removeRest', content: 'Remove unselected', onClickFunction: remove(unselected)},
  {id: 'lockSelected', content: 'Lock all', onClickFunction: lock(selected)},
  layoutFor(selected, 'selected'),
  // {
  //   id: 'dagreHere',
  //   content: 'Dagre layout here',
  //   onClickFunction: (e) => {
  //     const selectedElements = cy.elements('node:selected');
  //     const internalEdges = selectedElements.edgesWith(selectedElements).edges('[originTools.0="rubrowser"][!circular]');
  //     let selection = selectedElements.union(internalEdges);

  //     // If there are multiple roots, attempt to link them in.
  //     let components = selection.components();
  //     while (components.length > 1) {
  //       console.log(`Reducing ${components.length} components`);
  //       const smallestComponent = components.reduce((min, c) => {
  //         if (min == null || c.length < min.length) {
  //           return c;
  //         }
  //         return min;
  //       });
  //       let smallestRoots = smallestComponent.roots();
  //       if (smallestRoots.length < 1) {
  //         smallestRoots = smallestComponent;
  //       }
  //       const rest = selectedElements.subtract(smallestComponent);
  //       selection = selection.union(rest.edgesTo(smallestRoots).edges('[originTools.0="rubrowser"]'));
  //       components = selection.components();
  //     }

  //     selection.layout({
  //       name: 'dagre',
  //       rankDir: 'TB',
  //       acyclicer: 'greedy',
  //     }).start();
  //   }
  // },
  // {
  //   id: 'dagreAcyclicer',
  //   content: 'Dagre layout using Dagre acyclicer',
  //   onClickFunction: (e) => {
  //     cy.elements(':selected').layout({
  //       name: 'dagre',
  //       rankDir: 'TB',
  //       ranker: 'longest-path',
  //       acyclicer: 'greedy'
  //     }).start();
  //   }
  // },
  // {
  //   id: 'bfsTest',
  //   content: 'Test BFS subsetting',
  //   onClickFunction: (e) => {
  //     const selected = cy.elements('node:selected, edge:selected[!circular]');
  //     cy.elements().unselect();
  //     selected.select();
  //   }
  // }
];
const withSelectionMenu = {
  id: 'withSelectionMenu',
  content: 'With Selection...',
  selector: 'node:selected, edge:selected',
  submenu: withSelectionSubmenuItems
};

const baseMenu = [
  {id: 'lock', content: 'Lock node', selector: 'node:unlocked', onClickFunction: lock(target)},
  {id: 'unlock', content: 'Unlock node', selector: 'node:locked', onClickFunction: unlock(target)},
  {id: 'remove', content: 'Remove node', selector: 'node', onClickFunction: remove(target)},
  {id: 'fit', content: 'Fit to all nodes', coreAsWell, onClickFunction: fitTo(cy)},
  {id: 'info', content: 'Log info', selector: 'node, edge', onClickFunction:
    (e) => {console.log(e.target.data());}
  },

]

const registerMenus = cy => {

// Extremely messy!
const bb = cy.bubbleSets();


const findMarkovClusters = () => {
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


const menuItems = [
  ...baseMenu,

  selectMenu,
  withSelectionMenu,
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
        // unconstrIter: 10, // 100,
        // userConstIter: 10,
        // allConstIter: 10,
        infinite: true,
        gapInequalities,
        edgeLength: edge => {
          if (edge.target().indegree() == 1) {
            return 150;
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
    onClickFunction: () => setTimeout(findMarkovClusters)
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
  }
];

return cy.contextMenus({menuItems});
};

export default registerMenus;