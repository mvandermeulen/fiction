<script lang="ts" setup>
import { vue } from '@factor/api'

const wrapper = vue.ref<HTMLElement>()
const width = vue.ref<number>(500)

/**
 * Get figure width
 */
function getWidth(): number {
  return wrapper.value ? wrapper.value.clientWidth : 100
}
/**
 * Scale figure based on width
 */
const scale = vue.computed(() => {
  return Math.max(Math.min(width.value / 500, 1), 0.5)
})

vue.onMounted(() => {
  /**
   * Get figure width
   */
  width.value = getWidth()
  /**
   * Update stage width on window resize
   */
  window.addEventListener('resize', () => {
    width.value = getWidth()
  })
})
</script>

<template>
  <figure ref="wrapper" class="figure-live-changes">
    <div class="stage-wrap" :style="{ transform: `scale(${scale})` }">
      <div class="stage">
        <div class="screenshot theme">
          <img src="../img/figure-lc-theme.svg" alt="Theme">
        </div>
        <div class="screenshot edit-post">
          <img src="../img/figure-lc-post.svg" alt="Post">
        </div>
      </div>
    </div>
  </figure>
</template>

<style lang="less">
figure.figure-live-changes {
  --color-wire: #e6ebf1;
  --color-shaded: #ced2dd;
  max-width: 100%;
  .stage-wrap {
    transform-origin: center left;
  }
  .stage {
    padding: 30% 0;
    width: 500px;
    position: relative;
    transform: translate(-120px, -50px) scale(1.1);
    transform-style: preserve-3d;
    @media (max-width: 900px) {
      transform: translate(-0, -0px);
    }
    .annotation {
      position: absolute;
      top: 0;
      left: 15%;
      transform: translateZ(10px);
      img {
        width: 300px;
      }
    }
    .screenshot {
      top: 35px;
      background: #fff;
      display: inline-block;
      img {
        max-width: 100%;
      }
      &.theme {
        position: absolute;
        right: 0;
        z-index: 0;
        padding: 5px;
        transform: scale(1) perspective(1040px) rotateY(-11deg) rotateX(2deg)
          rotate(2deg) translateZ(-40px);
        box-shadow: 1px 1px 4px 0 rgba(26, 26, 67, 0.1),
          19px 25.5px 15px -25px rgba(50, 50, 93, 0.3),
          13.4px 25.5px 75px -37.5px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        border-radius: 4px;
      }
      &.edit-post {
        position: absolute;
        top: 110px;
        left: 0;
        padding: 5px;
        transform: scale(1) perspective(1050px) rotateY(11deg) rotateX(-2deg)
          rotate(-2deg);
        box-shadow: 1px 1px 4px 0 rgba(26, 26, 67, 0.1),
          -19px 32.5px 105px -5px rgba(50, 50, 93, 0.3),
          13.4px 37.5px 55px -37.5px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        border-radius: 4px;
      }
    }
    perspective: 1000px;
  }
}
</style>
