import cytoscape from "cytoscape";
import cola from "cytoscape-cola";
import graphTasks from './graphtasks';

import './style.css';

cytoscape.use(cola);

const container = document.createElement('div');
container.id = 'cy';
document.body.appendChild(container);

const cy = cytoscape({container});
const tasks = graphTasks(cy);

fetch('/cy.css')
  .then(response => response.text())
  .then(response => cy.style(response));

// fetch('/rails-redacted.cy.json')
fetch('/rails.cy.json')
  .then(response => response.json())
  .then(tasks.addBreaksToNames)
  .then(response => cy.json(response))
  .then(tasks.unparentAll)
  // .then(createVirtualParentNodes)
  // .then(applySiblingBond)

  .then(() => {
    const dag = cy.nodes().union(
      cy.edges('[originTools.0="rubrowser"][!circular]')
    );
    console.log(`dag: ${dag.nodes().length}, ${dag.edges().length}`);
    const layout = dag.layout({
      name: 'cola',
      flow: {
        axis: 'x',
        minSeparation: 30,
      },
      fit: false,
      edgeLength: 5,
      infinite: true,
    })
    const layout2 = cy.layout({
      name: 'cola',
      randomize: false,
      fit: false,
      edgeLength: 5,
      infinite: true,
    });

    layout.promiseOn('layoutready').then(() => {
      cy.fit();
      layout2.start();
    })
    
    layout.start();
  })
  
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