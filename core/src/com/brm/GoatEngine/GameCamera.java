package com.brm.GoatEngine;

import com.badlogic.gdx.graphics.OrthographicCamera;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.Utils.Timer;

/**
 * A Camera with speed of movement and of zoom
 */
public class GameCamera extends OrthographicCamera {


    //For Smooth camera movement(delayed camera movement, (the higher the most direct and quick))
    private Vector2 speed = new Vector2(8.0f, 5.0f);

    private float zoomSpeed = -1; //The zoom speed (-1 one values means the system will decide by itself)

    //Zoom properties
    private float minimumZoom = 0.3f; //The minimum value the camera can Zoom In/Out ==> 1 = default Viewport width value (no Zoom)
    private float maximumZoom = 1.7f; //The maximum value the camera can Zoom In/Out

    private boolean isXAxisLocked = false;
    private boolean isYAxisLocked = false;


    // SHAKING
    private final Vector2 virtualPosition = new Vector2();
    private final Timer shakeDuration = new Timer(200);

    private float maxShakeOffset = 0.1f; // In world unit Max possible offset
    private float shakeStrength = 3;

    private boolean shaking = false;

    private final Vector2 offset = new Vector2(); //Curent offset from real position
    private boolean shakeDirection = false; // false = bottom_left,  true = top_right


    public GameCamera(){
        super();
    }

    public GameCamera(float viewportWidth, float viewportHeight){
        super(viewportWidth, viewportHeight);
    }



    public Vector2 getSpeed() {
        return speed;
    }

    public void setSpeed(Vector2 speed) {
        this.speed = speed;
    }

    public float getZoomSpeed() {
        return zoomSpeed;
    }

    public void setZoomSpeed(float zoomSpeed) {
        this.zoomSpeed = zoomSpeed;
    }

    public float getMinimumZoom() {
        return minimumZoom;
    }

    public void setMinimumZoom(float minimumZoom) {
        this.minimumZoom = minimumZoom;
    }

    public float getMaximumZoom() {
        return maximumZoom;
    }

    public void setMaximumZoom(float maximumZoom) {
        this.maximumZoom = maximumZoom;
    }


    public boolean isYAxisLocked() {
        return isYAxisLocked;
    }

    public void setYAxisLocked(boolean isYAxisLocked) {
        this.isYAxisLocked = isYAxisLocked;
    }

    public boolean isXAxisLocked() {
        return isXAxisLocked;
    }

    public void setXAxisLocked(boolean isXAxisLocked) {
        this.isXAxisLocked = isXAxisLocked;
    }


    public boolean isLocked(){
        return isXAxisLocked && isYAxisLocked;
    }

    private void setLocked(boolean isLocked){
        this.setXAxisLocked(isLocked);
        this.setYAxisLocked(isLocked);
    }

    private void lock(){
        this.setLocked(true);
    }

    private void unlock(){
        this.setLocked(false);
    }


    public Timer getShakeDuration() {
        return shakeDuration;
    }


    public boolean isShaking() {
        return shaking;
    }

    public void setShaking(boolean shaking) {
        this.shaking = shaking;
    }

    public float getMaxShakeOffset() {
        return maxShakeOffset;
    }

    public void setMaxShakeOffset(int maxShakeOffset) {
        this.maxShakeOffset = maxShakeOffset;
    }


    public Vector2 getOffset() {
        return offset;
    }

    public boolean getShakeDirection() {
        return shakeDirection;
    }

    public void setShakeDirection(boolean shakeDirection) {
        this.shakeDirection = shakeDirection;
    }

    public Vector2 getVirtualPosition() {
        return virtualPosition;
    }

    public float getShakeStrength() {
        return shakeStrength;
    }

    public void setShakeStrength(float shakeStrength) {
        this.shakeStrength = shakeStrength;
    }
}
