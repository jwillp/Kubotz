import com.brm.GoatEngine.ScriptingEngine.EntityScript
import com.brm.GoatEngine.ECS.core.*

class MainScript extends EntityScript{

	/**
    * Called every frame
    * @param entity the entity to update with the script
    */
    public void onUpdate(Entity entity, EntityManager entityManager){
    	GoatEngine.console.log("YESSS!", "SUCCESS");
    }
}
new MainScript();