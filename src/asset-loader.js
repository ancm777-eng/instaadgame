/* ============================================================================
 * src/asset-loader.js — CC0 .glb Auto-Scale, Pivot & Animation Normalization Loader
 * Uses THREE.GLTFLoader + THREE.SkeletonUtils.clone()
 * ============================================================================ */
(function () {
  "use strict";

  var TARGET_HEIGHTS = {
    wizard: 1.8,
    fairy_worker: 1.3,
    customer: 1.6,
    slime_normal: 1.2,
    slime_king: 3.2,
    tree: 4.5,
    cauldron: 1.15,
    sales_stall: 2.5,
    gem_pedestal: 0.85,
    harvester_cart: 1.6,
    rock_crystal: 1.35,
    berry_bush: 1.25,
    fence: 1.4,
    stack_block: 0.22,
    mana_gem: 0.18
  };

  function readManifestJson() {
    if (typeof fetch === "function") {
      return fetch("assets/models/manifest.json", { cache: "no-cache" }).then(function (resp) {
        if (!resp.ok) throw new Error("Failed to fetch assets/models/manifest.json: HTTP " + resp.status);
        return resp.json();
      });
    }
    if (typeof window !== "undefined" && typeof window.__READ_JSON_FILE__ === "function") {
      return Promise.resolve(window.__READ_JSON_FILE__("assets/models/manifest.json"));
    }
    return Promise.reject(new Error("No fetch or file reader available for manifest.json"));
  }

  function cloneAndNormalizeMaterial(srcMat, opts) {
    if (!srcMat || typeof srcMat.clone !== "function") return srcMat;
    var mat = srcMat.clone();

    if ("envMapIntensity" in mat) {
      mat.envMapIntensity = 0.28;
    }
    if (typeof mat.roughness === "number") {
      mat.roughness = Math.min(0.72, Math.max(0.25, mat.roughness));
    }
    if (typeof mat.metalness === "number") {
      mat.metalness = Math.min(0.65, mat.metalness);
    }

    if (mat.color && typeof mat.color.r === "number") {
      var lum = 0.2126 * mat.color.r + 0.7152 * mat.color.g + 0.0722 * mat.color.b;
      if (lum < 0.08 && typeof mat.color.getHSL === "function" && typeof mat.color.setHSL === "function") {
        var hsl = { h: 0, s: 0, l: 0 };
        mat.color.getHSL(hsl);
        mat.color.setHSL(hsl.h, Math.min(0.85, hsl.s), Math.max(0.18, hsl.l));
      }
      if (opts && opts.tint !== undefined) {
        var tintColor = new THREE.Color(opts.tint);
        var strength = opts.tintStrength !== undefined ? opts.tintStrength : 0.45;
        mat.color.lerp(tintColor, strength);
      }
    }

    if (opts && opts.emissiveTint !== undefined && mat.emissive && typeof mat.emissive.setHex === "function") {
      mat.emissive.setHex(opts.emissiveTint);
      mat.emissiveIntensity = opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 0.22;
    }

    mat.userData = mat.userData || {};
    mat.userData._baseColor = mat.color ? mat.color.clone() : null;
    mat.userData._baseEmissive = mat.emissive ? mat.emissive.clone() : null;
    mat.userData._baseEmissiveIntensity = mat.emissiveIntensity !== undefined ? mat.emissiveIntensity : 0;

    return mat;
  }

  function findClipByRegex(animations, regex, fallback) {
    if (!Array.isArray(animations) || animations.length === 0) return null;
    for (var i = 0; i < animations.length; i++) {
      var clip = animations[i];
      if (clip && typeof clip.name === "string" && regex.test(clip.name)) {
        return clip;
      }
    }
    return fallback || null;
  }

  function createAnimController(rootModel, animations, manifestAnims) {
    var clips = Array.isArray(animations) ? animations : [];
    if (clips.length === 0 || typeof THREE.AnimationMixer !== "function") {
      return {
        mixer: null,
        clipMap: {},
        manifestAnims: manifestAnims || [],
        currentState: "idle",
        play: function () {},
        update: function () {}
      };
    }

    var firstClip = clips[0];
    var idleClip = findClipByRegex(clips, /idle|stand|wait|survey|breath|tpose/i, firstClip);
    var walkClip = findClipByRegex(clips, /walk|run|move|gallop|fly|flutter/i, clips[1] || firstClip);
    var runClip = findClipByRegex(clips, /run|sprint|gallop|walk|fly/i, walkClip || firstClip);
    var attackClip = findClipByRegex(clips, /attack|punch|swing|hit|bite|slash|wave|jump|yes/i, walkClip || idleClip);

    var clipMap = {
      idle: idleClip,
      walk: walkClip,
      run: runClip,
      attack: attackClip
    };

    var mixer = new THREE.AnimationMixer(rootModel);
    var actions = {};
    var keys = Object.keys(clipMap);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (clipMap[k]) {
        actions[k] = mixer.clipAction(clipMap[k]);
      }
    }

    var currentState = null;
    var currentAction = null;

    if (actions.idle) {
      actions.idle.reset().play();
      currentState = "idle";
      currentAction = actions.idle;
    }

    return {
      mixer: mixer,
      clipMap: clipMap,
      actions: actions,
      manifestAnims: manifestAnims || [],
      get currentState() {
        return currentState;
      },
      play: function (stateName, crossFadeSec) {
        var nextAction = actions[stateName] || actions.idle;
        if (!nextAction) return;
        if (currentState === stateName && currentAction === nextAction && stateName !== "attack") {
          return;
        }
        var fade = crossFadeSec !== undefined ? crossFadeSec : 0.15;
        if (currentAction && currentAction !== nextAction) {
          nextAction.reset();
          nextAction.setEffectiveTimeScale(1);
          nextAction.setEffectiveWeight(1);
          nextAction.play();
          currentAction.crossFadeTo(nextAction, fade, false);
        } else if (!currentAction) {
          nextAction.reset().play();
        } else if (stateName === "attack") {
          nextAction.reset().play();
        }
        currentState = stateName;
        currentAction = nextAction;
      },
      update: function (dt) {
        if (dt > 0) mixer.update(dt);
      }
    };
  }

  function createFallbackProceduralPlaceholder(role) {
    // Only reached if an external caller requests an unknown role not in manifest.json
    var box = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, TARGET_HEIGHTS[role] || 1.0, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xb98cff, roughness: 0.45 })
    );
    var g = new THREE.Group();
    g.add(box);
    return { scene: g, animations: [], meta: { role: role, targetHeight: TARGET_HEIGHTS[role] || 1.0, animations: [] } };
  }

  var AssetLoader = {
    TARGET_HEIGHTS: TARGET_HEIGHTS,
    manifest: null,
    cache: {},
    errors: [],
    loadedCount: 0,
    totalCount: 0,

    loadAll: function (onProgress) {
      var self = this;
      self.errors = [];
      self.cache = {};

      if (typeof THREE === "undefined" || typeof THREE.GLTFLoader !== "function") {
        var err = new Error("THREE.GLTFLoader is not loaded");
        self.errors.push(err.message);
        return Promise.reject(err);
      }

      var loader = new THREE.GLTFLoader();

      return readManifestJson().then(function (manifest) {
        self.manifest = manifest;
        var models = manifest && manifest.models ? manifest.models : {};
        var roles = Object.keys(models);
        self.totalCount = roles.length;
        self.loadedCount = 0;

        var tasks = roles.map(function (role) {
          var entry = models[role];
          return new Promise(function (resolve, reject) {
            var handleGltf = function (gltf) {
              self.cache[role] = {
                scene: gltf.scene,
                animations: gltf.animations || [],
                meta: entry
              };
              self.loadedCount += 1;
              if (typeof onProgress === "function") {
                onProgress(self.loadedCount, self.totalCount, role);
              }
              resolve(role);
            };

            var handleErr = function (e) {
              var msg = "Failed to parse GLB '" + role + "' (" + entry.file + "): " + (e && e.message ? e.message : String(e));
              self.errors.push(msg);
              reject(new Error(msg));
            };

            if (typeof window !== "undefined" && typeof window.__READ_BINARY_FILE__ === "function") {
              try {
                var arrBuf = window.__READ_BINARY_FILE__(entry.file);
                loader.parse(arrBuf, "", handleGltf, handleErr);
              } catch (readErr) {
                handleErr(readErr);
              }
            } else {
              loader.load(entry.file, handleGltf, undefined, handleErr);
            }
          });
        });

        return Promise.all(tasks).then(function () {
          return {
            loadedCount: self.loadedCount,
            totalCount: self.totalCount,
            roles: roles,
            errors: self.errors
          };
        });
      });
    },

    hasRole: function (role) {
      return !!this.cache[role];
    },

    createInstance: function (role, opts) {
      var entry = this.cache[role] || createFallbackProceduralPlaceholder(role);
      var clone = (typeof THREE !== "undefined" && THREE.SkeletonUtils && typeof THREE.SkeletonUtils.clone === "function")
        ? THREE.SkeletonUtils.clone(entry.scene)
        : entry.scene.clone(true);

      // 1) Reset transform and measure raw world bounding box
      clone.position.set(0, 0, 0);
      clone.rotation.set(0, 0, 0);
      clone.scale.set(1, 1, 1);
      clone.updateMatrixWorld(true);

      var rawBox = new THREE.Box3().setFromObject(clone);
      var rawH = Math.max(0.0001, rawBox.max.y - rawBox.min.y);
      var targetH = (opts && opts.targetHeight) || TARGET_HEIGHTS[role] || (entry.meta && entry.meta.targetHeight) || 1.5;

      // 2) Auto-scale to targetHeight (m)
      var scaleFactor = targetH / rawH;
      clone.scale.setScalar(scaleFactor);
      clone.updateMatrixWorld(true);

      // 3) Foot pivot zero-alignment (box.min.y === 0) & XZ centering
      var postBox = new THREE.Box3().setFromObject(clone);
      var center = new THREE.Vector3();
      postBox.getCenter(center);
      clone.position.set(-center.x, -postBox.min.y, -center.z);
      clone.updateMatrixWorld(true);

      var root = new THREE.Group();
      root.name = "GLB_" + role;
      root.add(clone);
      root.updateMatrixWorld(true);

      // 4) Cast/receive shadow & bright fairy-tale material tone unification
      var materials = [];
      clone.traverse(function (child) {
        if (child && child.isMesh) {
          child.castShadow = opts && opts.castShadow !== undefined ? !!opts.castShadow : true;
          child.receiveShadow = opts && opts.receiveShadow !== undefined ? !!opts.receiveShadow : true;
          if (child.isSkinnedMesh) {
            child.frustumCulled = false;
          }
          if (Array.isArray(child.material)) {
            child.material = child.material.map(function (m) {
              var cloned = cloneAndNormalizeMaterial(m, opts);
              if (cloned) materials.push(cloned);
              return cloned;
            });
          } else if (child.material) {
            var clonedSingle = cloneAndNormalizeMaterial(child.material, opts);
            child.material = clonedSingle;
            materials.push(clonedSingle);
          }
        }
      });

      // 5) Automatic AnimationMixer state controller
      var anim = createAnimController(
        clone,
        entry.animations,
        entry.meta ? entry.meta.animations : []
      );

      return {
        role: role,
        root: root,
        model: clone,
        materials: materials,
        anim: anim,
        meta: entry.meta,
        scaleFactor: scaleFactor
      };
    }
  };

  if (typeof window !== "undefined") {
    window.AssetLoader = AssetLoader;
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = AssetLoader;
  }
})();
