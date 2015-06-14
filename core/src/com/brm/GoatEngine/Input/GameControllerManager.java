package com.brm.GoatEngine.Input;

import com.badlogic.gdx.controllers.Controller;
import com.badlogic.gdx.controllers.ControllerListener;
import com.badlogic.gdx.controllers.Controllers;
import com.badlogic.gdx.controllers.PovDirection;
import com.badlogic.gdx.math.Vector3;
import com.badlogic.gdx.utils.Array;
import com.brm.GoatEngine.InputManager;

/**
 * Manages Game Controllers (GamePads)
 */
public class GameControllerManager implements ControllerListener{

    private final InputManager inputManager;

    private Array<Controller> availableControllers; // List of controllers that arent being used

    public GameControllerManager(InputManager inputManager){
        this.inputManager = inputManager;

        availableControllers = Controllers.getControllers();

        // TODO a getControllerMap() method
    }


    /**
     * Makes a Controller available again
     */
    public void releaseController(Controller controller){
        this.availableControllers.add(controller);
    }


    /**
     * Removes a controller from the available list
     * and returns it
     */
    public Controller captureController(){
        try{
            Controller controller = this.availableControllers.first();
            this.availableControllers.removeIndex(0);
            return controller;
        }catch(IllegalStateException e){
            throw new NoControllersAvailableException();
        }
    }

    /**
     * A {@link com.badlogic.gdx.controllers.Controller} got connected.
     *
     * @param controller
     */
    @Override
    public void connected(Controller controller) {
        if(!this.availableControllers.contains(controller, true)){
            this.availableControllers.add(controller);
        }
        // TODO Send Event?
    }

    /**
     * A {@link com.badlogic.gdx.controllers.Controller} got disconnected.
     *
     * @param controller
     */
    @Override
    public void disconnected(Controller controller) {
        if(this.availableControllers.contains(controller, true)){
            this.availableControllers.removeValue(controller, true);
        }
        // TODO Send Event?
    }



    /**
     * A button on the {@link com.badlogic.gdx.controllers.Controller} was pressed. The buttonCode is controller specific. The
     * <code>com.badlogic.gdx.controllers.mapping</code> package hosts button constants for known controllers.
     *
     * @param controller
     * @param buttonCode
     * @return whether to hand the event to other listeners.
     */
    @Override
    public boolean buttonDown(Controller controller, int buttonCode) {
        return false;
    }

    /**
     * A button on the {@link com.badlogic.gdx.controllers.Controller} was released. The buttonCode is controller specific. The
     * <code>com.badlogic.gdx.controllers.mapping</code> package hosts button constants for known controllers.
     *
     * @param controller
     * @param buttonCode
     * @return whether to hand the event to other listeners.
     */
    @Override
    public boolean buttonUp(Controller controller, int buttonCode) {
        return false;
    }

    /**
     * An axis on the {@link com.badlogic.gdx.controllers.Controller} moved. The axisCode is controller specific. The axis value is in the range [-1, 1]. The
     * <code>com.badlogic.gdx.controllers.mapping</code> package hosts axes constants for known controllers.
     *
     * @param controller
     * @param axisCode
     * @param value      the axis value, -1 to 1
     * @return whether to hand the event to other listeners.
     */
    @Override
    public boolean axisMoved(Controller controller, int axisCode, float value) {
        return false;
    }

    /**
     * A POV on the {@link com.badlogic.gdx.controllers.Controller} moved. The povCode is controller specific. The
     * <code>com.badlogic.gdx.controllers.mapping</code> package hosts POV constants for known controllers.
     *
     * @param controller
     * @param povCode
     * @param value
     * @return whether to hand the event to other listeners.
     */
    @Override
    public boolean povMoved(Controller controller, int povCode, PovDirection value) {
        return false;
    }

    /**
     * An x-slider on the {@link com.badlogic.gdx.controllers.Controller} moved. The sliderCode is controller specific. The
     * <code>com.badlogic.gdx.controllers.mapping</code> package hosts slider constants for known controllers.
     *
     * @param controller
     * @param sliderCode
     * @param value
     * @return whether to hand the event to other listeners.
     */
    @Override
    public boolean xSliderMoved(Controller controller, int sliderCode, boolean value) {
        return false;
    }

    /**
     * An y-slider on the {@link com.badlogic.gdx.controllers.Controller} moved. The sliderCode is controller specific. The
     * <code>com.badlogic.gdx.controllers.mapping</code> package hosts slider constants for known controllers.
     *
     * @param controller
     * @param sliderCode
     * @param value
     * @return whether to hand the event to other listeners.
     */
    @Override
    public boolean ySliderMoved(Controller controller, int sliderCode, boolean value) {
        return false;
    }

    /**
     * An accelerometer value on the {@link com.badlogic.gdx.controllers.Controller} changed. The accelerometerCode is controller specific. The
     * <code>com.badlogic.gdx.controllers.mapping</code> package hosts slider constants for known controllers. The value is a
     * {@link com.badlogic.gdx.math.Vector3} representing the acceleration on a 3-axis accelerometer in m/s^2.
     *
     * @param controller
     * @param accelerometerCode
     * @param value
     * @return whether to hand the event to other listeners.
     */
    @Override
    public boolean accelerometerMoved(Controller controller, int accelerometerCode, Vector3 value) {
        return false;
    }


    /**
     * Thrown when there are no Controllers available
     */
    public class NoControllersAvailableException extends RuntimeException{

        public NoControllersAvailableException(){
            super("No controllers where found");
        }
    }



}
