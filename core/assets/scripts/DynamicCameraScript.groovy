import com.badlogic.gdx.Gdx
import com.badlogic.gdx.graphics.OrthographicCamera
import com.badlogic.gdx.math.MathUtils
import com.badlogic.gdx.math.Vector2
import com.brm.GoatEngine.ECS.common.CameraComponent
import com.brm.GoatEngine.ECS.common.PhysicsComponent
import com.brm.GoatEngine.ECS.core.CameraTargetComponent
import com.brm.GoatEngine.ECS.core.Entity
import com.brm.GoatEngine.ECS.core.EntityManager
import com.brm.GoatEngine.EventManager.GameEvent
import com.brm.GoatEngine.EventManager.GameEventListener
import com.brm.GoatEngine.GoatEngine
import com.brm.GoatEngine.ScriptingEngine.EntityScript
import com.brm.GoatEngine.Utils.Logger
import com.brm.GoatEngine.Utils.Math.Vectors
import com.brm.GoatEngine.Utils.Timer
import com.brm.Kubotz.Common.Events.DamageTakenEvent

/**
 * A dynamic camera always positioning itself so that all entities with a CameraTargetComponent
 * stay within the camera view port (by zooming and moving)
 */
public class DynamicCamera extends EntityScript implements GameEventListener{

    private OrthographicCamera camera;

    //For Smooth camera movement(delayed camera movement, (the higher the most direct and quick))
    private Vector2 speed = new Vector2(8.0f, 5.0f);

    //The zoom speed (-1 one values means the system will decide by itself)
    private float zoomSpeed = -1;

    //Zoom properties
    //The minimum value the camera can Zoom In/Out ==> 1 = default Viewport width value (no Zoom)
    private float minimumZoom = 0.2f; //The closer we can get
    private float maximumZoom = 1.0f; //The maximum value the camera can Zoom Out


    private boolean isXAxisLocked = false;  //if the camera is locked on the X Axis
    private boolean isYAxisLocked = false;  //if the camera is locked on the Y Axis


    // SHAKING
    //The position the camera should be having, if it was not shaking
    private final Vector2 virtualPosition = new Vector2();
    private final Timer shakeDuration = new Timer(200); //the duration of a camera shake in ms

    private float maxShakeOffset = 0.1f; // In world unit Max possible offset
    private float shakeStrength = 3;     // The strength of the shake

    private boolean shaking = false;    // if the camera is shaking

    private final Vector2 offset = new Vector2(); //Current offset from real position
    private boolean shakeDirection = false; // false = bottom_left,  true = top_right

    def maxX = 50;
    def minX = 0;

    def maxY = 40;
    def minY = 0;




    /**
     * Called when a script is added to an entity
     */
    @Override
    public void onInit(Entity entity, EntityManager entityManager){
        GoatEngine.eventManager.addListener(this);

        camera = ((CameraComponent)entity.getComponent(CameraComponent.ID)).getCamera();

    }



    /**
     * Called every frame
     * @param entity the entity to update with the script
     */
    @Override
    void onUpdate(Entity entity, EntityManager entityManager) {

        //UPDATE THE CAMERA
        Vector2 leftMost = new Vector2(Integer.MAX_VALUE,Float.MAX_VALUE);
        Vector2 rightMost = new Vector2(Integer.MIN_VALUE, Integer.MIN_VALUE);

        //Find the left most entity and the right most entity
        for(Entity target : entityManager.getEntitiesWithComponentEnabled(CameraTargetComponent.ID)){
            PhysicsComponent phys = (PhysicsComponent) target.getComponent(PhysicsComponent.ID);

            leftMost.x = Math.min(leftMost.x, phys.getPosition().x);
            leftMost.y = Math.min(leftMost.y, phys.getPosition().y);

            rightMost.x = Math.max(rightMost.x, phys.getPosition().x);
            rightMost.y = Math.max(rightMost.y, phys.getPosition().y);
        }



        // Find the center point between between the two entities
        updatePosition(leftMost, rightMost);

        //ZOOM IN/OUT according to the distance between the two entities
        updateZoom(leftMost, rightMost);

        // Update camera Shake effect
        updateCameraShake(GoatEngine.graphicsEngine.deltaTime);

        //Update the camera
        camera.update();
    }



    /**
     * Updates the position of the camera according to the leftMost entity (minPosition)
     * And the right most entity (maxPosition) so it is placed between to two positions
     * @param leftMost The left most object's position
     * @param rightMost The right most object's position
     */
    private void updatePosition(Vector2 leftMost, Vector2 rightMost){
        if(isLocked()){
            return;
        }
        // Find the center point between leftMost and rightMost pos
        float centerX = (leftMost.x + rightMost.x)*0.5f;
        float centerY = (leftMost.y + rightMost.y)*0.5f;

        def visibleX, visibleY
        (visibleX, visibleY) = getVisibility()

        //All is good let's lerp for smooth cam movements
        float lerpProgress = this.speed.x * Gdx.graphics.getDeltaTime();
        if(!this.isXAxisLocked){
            //Clamp centerX
            //centerX = MathUtils.clamp(centerX, minX + visibleX/2 as float, maxX - visibleX/2 as float)
            camera.position.x = MathUtils.lerp(camera.position.x, centerX, lerpProgress);
        }
        if(!this.isYAxisLocked){
            //centerY = MathUtils.clamp(centerY, minY + visibleY/2 as float, maxY - visibleY/2 as float)
            camera.position.y = MathUtils.lerp(camera.position.y, centerY, lerpProgress);
        }
    }




    /**
     * Updates the Zoom of the camera according to the leftMost entity (minPosition)
     * And the right most entity (maxPosition) so both position are visible to the camera
     * @param leftMost
     * @param rightMost
     */
    private void updateZoom(Vector2 leftMost, Vector2 rightMost){

        //Pythagorean distance
        float zoomFactor = (float)(Vectors.manhattanDistance(leftMost, rightMost)/10.0f); //TODO 10? what was I thinking?
        zoomFactor = MathUtils.clamp(zoomFactor, minimumZoom, maximumZoom);

        //if the camera has no particular zoom speed, we'll define one based on camera speed
        float zoomSpeed = this.zoomSpeed == -1 ? this.speed.len() : this.zoomSpeed/2;

        //limit the zoom factor so we dont see too much
        //float visX, visY
        //(visX, visY) = getVisibility()
        //def zoomMax =  maxX/visX as float
        //zoomFactor = MathUtils.clamp(zoomFactor, minimumZoom, zoomMax);

        //LERP for smooth zoom
        camera.zoom = MathUtils.lerp(camera.zoom, zoomFactor, zoomSpeed * Gdx.graphics.deltaTime as float);
    }



    /***
     * Returns the current visibility in world unit of the camera
     * @return
     */
    def getVisibility(){
        float visibleX = camera.viewportWidth *  camera.zoom; //The number of tiles visible in X at the moment
        float visibleY = camera.viewportHeight *  camera.zoom;//The number of tiles visible in Y at the moment
        return [visibleX, visibleY]
    }



    /**
     * Makes the camera shake when needed
     * Source: http://gamedev.stackexchange.com/questions/32013/shaky-camera-effect-2d
     */
    private void updateCameraShake(float delta){
        if(this.shakeDuration.isDone()){
            this.shaking = false;
            offset.set(0,0);
        }

        if(shaking){

            if(shakeDirection){
                offset.x -= shakeStrength * delta;
                if(offset.x < -maxShakeOffset){
                    offset.x = -maxShakeOffset;
                    shakeDirection = !shakeDirection;
                }
                offset.y = offset.x;
            }else{
                offset.x += shakeStrength * delta;
                if(offset.x > maxShakeOffset){
                    offset.x = maxShakeOffset;
                    shakeDirection = !shakeDirection;
                }
                offset.y = -offset.x;

            }

            camera.position.x = virtualPosition.x + offset.x;
            camera.position.y = virtualPosition.y + offset.y;

        }else{

            virtualPosition.x = camera.position.x;
            virtualPosition.y = camera.position.y;
        }

    }




    @Override
    void onEvent(GameEvent e) {
        if(e.getClass() == DamageTakenEvent.class){
            //Make the camera shake
            shaking = true;
            shakeDuration.reset();
        }
    }


    public boolean isLocked(){
        return isXAxisLocked && isYAxisLocked;
    }


}