import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { $el } from "/scripts/ui.js";

const p5jsPreviewSrc = new URL(`../preview/index.html`, import.meta.url);

async function saveSketch(filename, srcCode) {
  try {
    const blob = new Blob([srcCode], { type: "text/plain" });
    const file = new File([blob], filename + ".js");
    const body = new FormData();
    body.append("image", file);
    body.append("subfolder", "p5js");
    body.append("type", "temp");
    body.append("overwrite", "true"); //can also be set to 1
    const resp = await api.fetchApi("/upload/image", {
      method: "POST",
      body,
    });
    if (resp.status !== 200) {
      const err = `Error uploading sketch: ${resp.status} - ${resp.statusText}`;
      alert(err);
      throw new Error(err);
    }

    return resp;
  } catch (e) {
    console.log(`Error sending sketch file for saving: ${e}`);
  }
} //end saveSketch

app.registerExtension({
  name: "HYPE_P5JSImage",

  getCustomWidgets(app) {
    return {
      P5JS(node, inputName) {
        const d = new Date();
        const base_filename =
          d.getUTCFullYear() +
          "_" +
          (d.getUTCMonth() + 1) +
          "_" +
          d.getUTCDate() +
          "_";

        const sketchfile =
          base_filename + Math.floor(Math.random() * 10000);

        const iframe = $el("iframe", {
          src: p5jsPreviewSrc,
          style: {
            border: "1px solid #000",
            width: "100%",
            height: "100%",
            padding: 0,
            margin: 0,
            display: "block",
            background: "#222",
          },
        });

        node.serialize_widgets = false;

        //add run sketch button first so it sits above the iframe
        const btn = node.addWidget(
          "button",
          "Run Sketch",
          "run_p5js_sketch",
          () => {
            saveSketch(sketchfile, node.widgets[0].value).then(() => {
              iframe.src = p5jsPreviewSrc + "?sketch=" + sketchfile + ".js";
            });
          }
        );
        btn.serializeValue = () => undefined;

        // addDOMWidget mounts the iframe inside ComfyUI's DOM-widget container,
        // which is automatically positioned/scaled by ComfyUI as the canvas pans and zooms.
        const widget = node.addDOMWidget("image", "P5JS", iframe, {
          hideOnZoom: false,
          getMinHeight: () => 400,
        });
        widget.sketchfile = sketchfile;

        return widget;
      },
    };
  },

  nodeCreated(node) {
    if (node.constructor.comfyClass !== "HYPE_P5JSImage") return;

    //get the p5js widget
    const p5jsWidget = node.widgets.find((w) => w.name === "image");

    //add serialize method here....
    p5jsWidget.serializeValue = async () => {
      //get the canvas from iframe
      const theFrame = p5jsWidget.element;
      const iframe_doc =
        theFrame.contentDocument || theFrame.contentWindow.document;
      const canvas = iframe_doc.getElementById("defaultCanvas0"); //TODO: maybe change this to pull all canvas elements and return the first one created

      const blob = await new Promise((r) => canvas.toBlob(r));
      const name = `${+new Date()}.png`;
      const file = new File([blob], name);
      const body = new FormData();
      body.append("image", file);
      body.append("subfolder", "p5js");
      body.append("type", "temp");
      const resp = await api.fetchApi("/upload/image", {
        method: "POST",
        body,
      });
      if (resp.status !== 200) {
        const err = `Error uploading image: ${resp.status} - ${resp.statusText}`;
        alert(err);
        throw new Error(err);
      }
      return `p5js/${name} [temp]`;
    };
  },
});
